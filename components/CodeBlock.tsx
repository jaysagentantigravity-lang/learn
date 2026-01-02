import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  return (
    <SyntaxHighlighter
      style={atomDark}
      language={language}
      PreTag="div"
      customStyle={{
        background: 'rgba(0, 0, 0, 0.4)', 
        margin: 0, 
        padding: '1.5rem',
        fontSize: '0.9rem'
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};

export default CodeBlock;