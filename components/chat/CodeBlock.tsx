import React from 'react';

const CodeBlock = ({ language, value }) => {
    return (
        <pre>
            <code>{value}</code>
        </pre>
    );
};

export default CodeBlock;