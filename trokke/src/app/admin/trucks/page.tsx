import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function getData() {
  const { data: trucks } = await supabaseAdmin.from('trucks').select('*');
  const { data: workers } = await supabaseAdmin
    .from('workers')
    .select('id, profiles(full_name)');
  return { trucks: trucks || [], workers: workers || [] };
}

export default async function TrucksPage() {
  const { trucks, workers } = await getData();

  async function create(formData: FormData) {
    'use server';
    const license_plate = formData.get('license_plate') as string;
    const make = formData.get('make') as string;
    const model = formData.get('model') as string;
    const year = Number(formData.get('year'));
    await supabaseAdmin.from('trucks').insert({ license_plate, make, model, year });
  }

  async function update(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const license_plate = formData.get('license_plate') as string;
    const make = formData.get('make') as string;
    const model = formData.get('model') as string;
    const year = Number(formData.get('year'));
    const assigned_worker_id = formData.get('assigned_worker_id') as string | null;
    await supabaseAdmin
      .from('trucks')
      .update({ license_plate, make, model, year, assigned_worker_id })
      .eq('id', id);
  }

  async function remove(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await supabaseAdmin.from('trucks').delete().eq('id', id);
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl mb-2">Trucks</h1>
      <form action={create} className="space-y-2 border p-3">
        <h2>Create Truck</h2>
        <input name="license_plate" placeholder="License Plate" className="border p-1" required />
        <input name="make" placeholder="Make" className="border p-1" required />
        <input name="model" placeholder="Model" className="border p-1" required />
        <input name="year" placeholder="Year" type="number" className="border p-1" required />
        <button type="submit" className="bg-blue-600 text-white px-2 py-1">Create</button>
      </form>
      <ul className="space-y-4">
        {trucks.map((truck) => (
          <li key={truck.id} className="border p-3">
            <form action={update} className="space-y-2">
              <input type="hidden" name="id" value={truck.id} />
              <input name="license_plate" defaultValue={truck.license_plate} className="border p-1" />
              <input name="make" defaultValue={truck.make} className="border p-1" />
              <input name="model" defaultValue={truck.model} className="border p-1" />
              <input name="year" type="number" defaultValue={truck.year} className="border p-1" />
              <select name="assigned_worker_id" defaultValue={truck.assigned_worker_id || ''} className="border p-1">
                <option value="">Unassigned</option>
                {workers.map((w) => (<option key={w.id} value={w.id}>{w.profiles.full_name}</option>))}
              </select>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-2 py-1">
                  Save
                </button>
              </div>
            </form>
                <form action={remove} className="mt-1">
                  <input type="hidden" name="id" value={truck.id} />
                  <button type="submit" className="bg-red-600 text-white px-2 py-1">Delete</button>
                </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

