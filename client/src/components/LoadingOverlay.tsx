export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center justify-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-neutral-500 text-lg">처리 중...</div>
        </div>
        <div className="mt-4 text-sm text-neutral-400 text-center">데이터를 처리하고 계산하는 중입니다. 잠시만 기다려주세요.</div>
      </div>
    </div>
  );
}
