export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-100 text-neutral-medium py-4">
      <div className="container mx-auto px-4 text-center text-sm">
        &copy; {currentYear} 급여 계산기 시스템. 모든 권리 보유.
      </div>
    </footer>
  );
}
