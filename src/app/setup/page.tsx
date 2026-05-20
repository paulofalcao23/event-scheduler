export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📅</div>
          <h1 className="text-2xl font-bold text-gray-900">Conectar Google Calendar</h1>
          <p className="text-sm text-gray-500 mt-2">
            Autorize o acesso para criar eventos automaticamente na sua agenda.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div>
            <p className="text-xs text-gray-500">Conta que será conectada</p>
            <p className="text-sm font-semibold text-gray-800">paulo.falcao@astrainfra.com.br</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <p className="font-medium mb-1">O que será permitido:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Criar eventos na agenda desta conta</li>
            <li>Definir lembretes automáticos</li>
            <li>Excluir eventos criados por este app</li>
          </ul>
        </div>

        <a
          href="/api/auth/login"
          className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
          Conectar paulo.falcao@astrainfra.com.br
        </a>

        <p className="text-center text-xs text-gray-400 mt-4">
          Você pode usar o sistema sem conectar ao Google Calendar.
          Os eventos serão salvos apenas localmente.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500">
          <p className="font-medium text-gray-600 mb-2">Pré-requisitos:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Projeto no Google Cloud Console criado</li>
            <li>API do Google Calendar habilitada</li>
            <li>Credenciais OAuth 2.0 configuradas em <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
          </ol>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-blue-600 hover:underline">
            ← Voltar para o sistema
          </a>
        </div>
      </div>
    </div>
  );
}
