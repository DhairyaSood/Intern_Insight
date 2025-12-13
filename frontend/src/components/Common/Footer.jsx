import React from 'react';
import { ThumbsUp } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="container-custom py-8">
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="flex items-center justify-center">
            Made with <ThumbsUp className="h-4 w-4 mx-1 text-red-500" /> by Intern Insight Team
          </p>
          <p className="mt-2">© {new Date().getFullYear()} Intern Insight. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
