import { redirect } from 'next/navigation';

// This component's sole purpose is to redirect any traffic
// going to /admin to the default /admin/trucks page.
export default function AdminRootPage() {
  redirect('/admin/trucks');
}