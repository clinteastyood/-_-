import { Link, useLocation } from "wouter";

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">급여 계산기</h1>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/">
                <a className={`px-3 py-2 rounded hover:bg-primary-dark transition ${location === '/' ? 'font-bold' : ''}`}>
                  데이터 업로드
                </a>
              </Link>
            </li>
            <li>
              <Link href={location.startsWith('/results/') ? location : '/results/latest'}>
                <a className={`px-3 py-2 rounded hover:bg-primary-dark transition ${location.startsWith('/results/') ? 'font-bold' : ''}`}>
                  결과 보기
                </a>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
