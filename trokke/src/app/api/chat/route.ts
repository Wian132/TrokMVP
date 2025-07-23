import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase-admin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- System Prompts for Different Roles ---
const adminSystemPrompt = `You are an expert admin assistant for a truck logistics company. You have access to a set of tools to query the company's database in real-time. When a user asks a question, determine if you can answer it using one of your tools. If so, call the appropriate function. If not, answer based on your general knowledge. Be concise and professional. Today's date is ${new Date().toLocaleDateString()}.`;

const workerSystemPrompt = `You are a helpful assistant for a truck driver. Your name is "Co-Pilot". Provide concise and clear information about safety protocols, route queries, and company policies. You do not have access to real-time data. Always prioritize safety in your answers. Your knowledge is based on general information up to your last training cut-off.`;

const clientSystemPrompt = `You are a friendly and professional customer service assistant for a logistics company. Your goal is to help clients with their questions about the company's services. You can explain what the company does, but you do not have access to specific, real-time data about their personal stores or truck locations. Keep your answers helpful and general.`;


// --- Define Tools (Functions) for the Admin ---
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_truck_count_by_status',
      description: 'Get the number of trucks for a given status (e.g., active, inactive, under_service).',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'The status of the trucks to count.',
            enum: ['active', 'inactive', 'under_service', 'decommissioned'],
          },
        },
        required: ['status'],
      },
    },
  },
  {
    type: 'function',
    function: {
        name: 'get_total_user_count_by_role',
        description: 'Get the total number of users for a given role (client or worker).',
        parameters: {
            type: 'object',
            properties: {
                role: {
                    type: 'string',
                    description: 'The role of the users to count.',
                    enum: ['client', 'worker'],
                },
            },
            required: ['role'],
        },
    },
  },
];

// --- Main API Handler ---
export async function POST(request: Request) {
  const { prompt, role, messages } = await request.json();

  if (!prompt || !role) {
    return NextResponse.json({ error: 'Prompt and role are required' }, { status: 400 });
  }

  let systemPrompt = '';
  switch (role) {
    case 'admin':
      systemPrompt = adminSystemPrompt;
      break;
    case 'worker':
      systemPrompt = workerSystemPrompt;
      break;
    case 'client':
      systemPrompt = clientSystemPrompt;
      break;
    default:
      return NextResponse.json({ error: 'Invalid user role' }, { status: 400 });
  }

  const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
    { role: 'user', content: prompt },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: conversationHistory,
      tools: role === 'admin' ? tools : undefined,
      tool_choice: role === 'admin' ? 'auto' : undefined,
    });

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls) {
      conversationHistory.push(responseMessage);

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResponse;

        // FIX: Replaced the function map with a switch statement for better type safety.
        // This eliminates the need for `any` and correctly handles different function signatures.
        switch (functionName) {
          case 'get_truck_count_by_status':
            functionResponse = await getTruckCountByStatus(functionArgs);
            break;
          case 'get_total_user_count_by_role':
            functionResponse = await getTotalUserCountByRole(functionArgs);
            break;
          default:
            console.warn(`Unknown function call: ${functionName}`);
            continue; // Skip this tool call if the function name is not recognized
        }

        conversationHistory.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(functionResponse),
        });
      }

      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: conversationHistory,
      });

      return NextResponse.json({ response: secondResponse.choices[0].message.content });
    }

    return NextResponse.json({ response: responseMessage.content });

  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return NextResponse.json({ error: 'Failed to get response from AI' }, { status: 500 });
  }
}

// --- Database Function Implementations ---
async function getTruckCountByStatus(args: { status: 'active' | 'inactive' | 'under_service' | 'decommissioned' }) {
    const { error, count } = await supabaseAdmin
        .from('trucks')
        .select('*', { count: 'exact', head: true })
        .eq('status', args.status);
    
    if (error) return { error: error.message };
    return { count };
}

async function getTotalUserCountByRole(args: { role: 'client' | 'worker' }) {
    const { error, count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', args.role);
    
    if (error) return { error: error.message };
    return { count };
}
