'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccountPage() {
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password updated successfully!");
      setPassword('');
        setConfirmPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-md mx-auto">
        <Card className="bg-white border border-gray-300 shadow-lg">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-black">Manage Your Account</CardTitle>
                <CardDescription className="text-gray-700">Update your password here.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                {error && <p className="text-red-700 bg-red-100 p-3 rounded-md mb-4 border border-red-200">{error}</p>}
                {success && <p className="text-green-700 bg-green-100 p-3 rounded-md mb-4 border border-green-200">{success}</p>}
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <Label htmlFor="password" className="block text-sm font-semibold text-black mb-1">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white text-black border border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="block text-sm font-semibold text-black mb-1">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-white text-black border border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-700 text-white hover:bg-green-800 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-bold py-2 px-4 rounded" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}