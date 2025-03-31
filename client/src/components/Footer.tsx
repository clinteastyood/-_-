export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-neutral-400">
          <p>© {currentYear} 급여 계산기 - 한국 노동법 기준</p>
        </div>
      </div>
    </footer>
  );
}
