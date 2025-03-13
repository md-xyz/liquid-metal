
import LiquidMetalEffect from '../components/LiquidMetalEffect';
import { ExternalLink } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-5xl mx-auto py-4 px-4 text-center">
        <p className="text-gray-400 text-sm mb-2">
          Modified from{' '}
          <a 
            href="https://liquid.paper.design/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-gray-300 hover:text-white transition-colors"
          >
            Paper Design 
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
          {' '}implementation
        </p>
      </div>
      <LiquidMetalEffect />
    </div>
  );
};

export default Index;
