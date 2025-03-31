export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary border-opacity-20 border-t-primary rounded-full animate-spin mb-3 mx-auto"></div>
        <p className="text-neutral-dark font-medium">처리 중입니다...</p>
      </div>
    </div>
  );
}
