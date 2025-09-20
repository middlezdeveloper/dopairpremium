export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dopair Premium Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">Welcome to your dashboard!</h2>
        <p className="text-gray-600 mb-4">Your AI coach and premium features are ready.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">🤖 AI Coach</h3>
            <p className="text-sm text-gray-600 mb-3">Chat with your personalized recovery coach</p>
            <a href="/dashboard/coach/test" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              Test AI Coach
            </a>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">📊 Your Progress</h3>
            <p className="text-sm text-gray-600 mb-3">Track your digital wellness journey</p>
            <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm">
              View Stats
            </button>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">🧪 Development Mode</h3>
        <p className="text-yellow-700 text-sm">
          You're in development mode. The AI coach is ready for testing with your OpenAI API key.
        </p>
      </div>
    </div>
  );
}