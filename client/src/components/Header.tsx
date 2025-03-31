import { Link } from "wouter";

interface HeaderProps {
  activeTab: 'upload' | 'results';
  setActiveTab: (tab: 'upload' | 'results') => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const handleTabChange = (tab: 'upload' | 'results') => {
    setActiveTab(tab);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0 1 1 0 012 0zm0-3a1 1 0 10-2 0v-1a1 1 0 112 0v1z" clipRule="evenodd"></path>
            </svg>
            <h1 className="ml-2 text-xl font-medium text-neutral-500">급여 계산기</h1>
          </div>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <Link href="/">
                  <button 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeTab === 'upload' 
                        ? 'bg-primary text-white' 
                        : 'text-neutral-500 bg-neutral-50 border border-neutral-100 hover:bg-primary hover:text-white'
                    } focus:outline-none focus:ring-2 focus:ring-primary`}
                    onClick={() => handleTabChange('upload')}
                  >
                    <svg 
                      className="w-4 h-4 inline-block mr-1" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    데이터 업로드
                  </button>
                </Link>
              </li>
              <li>
                <Link href="/results">
                  <button 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      activeTab === 'results' 
                        ? 'bg-primary text-white' 
                        : 'text-neutral-500 bg-neutral-50 border border-neutral-100 hover:bg-primary hover:text-white'
                    } focus:outline-none focus:ring-2 focus:ring-primary`}
                    onClick={() => handleTabChange('results')}
                  >
                    <svg 
                      className="w-4 h-4 inline-block mr-1" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    급여 계산 결과
                  </button>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
