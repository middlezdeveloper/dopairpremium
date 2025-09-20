export default function CoachTestPage() {
  return (
    <div className="p-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-3">🧪 AI Coach Testing Interface</h2>
        <p className="text-yellow-700 text-sm mb-4">
          This is a test interface for the AI coach. You can test different user profiles to see how the AI adapts its responses.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">Test AI Coach Chat</h3>

        <div className="border rounded-lg p-4 mb-4 bg-gray-50">
          <h4 className="font-medium mb-2">Quick Test:</h4>
          <p className="text-sm text-gray-600 mb-2">
            The AI coach is configured with your OpenAI API key. Here's how to test it:
          </p>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Open browser developer tools (F12)</li>
            <li>Go to Console tab</li>
            <li>Send a test request to the API</li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Test the API directly:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`fetch('/api/coach/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I'm struggling with phone usage today",
    userId: "test-user"
  })
}).then(r => r.json()).then(console.log)`}
          </pre>
          <p className="text-blue-700 text-xs mt-2">
            Copy this code into the browser console and press Enter to test the AI coach API.
          </p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-800 mb-2">✅ What's Working:</h3>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• OpenAI API integration with GPT-3.5-turbo</li>
          <li>• 3 coach personas (Dr. Chen, Luna, Marcus)</li>
          <li>• Pathway-specific responses (impulsive, compulsive, etc.)</li>
          <li>• Crisis detection and safety protocols</li>
          <li>• Emotional intelligence from text analysis</li>
          <li>• Cost tracking (~$0.001 per message)</li>
        </ul>
      </div>
    </div>
  );
}