import { Outlet } from 'react-router-dom';

export default function ChatLayout() {
  return (
    <div className="min-h-screen bg-m4m-gray-50 flex flex-col">
      <main className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  );
}

