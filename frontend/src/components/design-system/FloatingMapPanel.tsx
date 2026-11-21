import React from 'react';

interface FloatingMapPanelProps {
  title: string;
  tag?: string;
  tagVariant?: 'cyan' | 'teal' | 'amber' | 'red' | 'default';
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  headerAction?: React.ReactNode;
}

export const FloatingMapPanel: React.FC<FloatingMapPanelProps> = ({
  title,
  tag,
  tagVariant = 'cyan',
  children,
  className = '',
  onClose,
  headerAction
}) => {
  const tagColor =
    tagVariant === 'cyan' ? 'text-[#16B8D4] border-[#16B8D4]/40 bg-[#16B8D4]/10' :
    tagVariant === 'teal' ? 'text-[#18A58B] border-[#18A58B]/40 bg-[#18A58B]/10' :
    tagVariant === 'amber' ? 'text-[#F0A83B] border-[#F0A83B]/40 bg-[#F0A83B]/10' :
    tagVariant === 'red' ? 'text-[#E45555] border-[#E45555]/40 bg-[#E45555]/10' :
    'text-[#8DA3B8] border-[#203A52] bg-[#07111F]';

  return (
    <div className={`bg-[#091522] border border-[#203A52] rounded p-3 select-none text-xs font-sans shadow-xl ${className}`}>
      <div className="flex items-center justify-between border-b border-[#203A52] pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#E8F0F7]">
            {title}
          </span>
          {tag && (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium ${tagColor}`}>
              {tag}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          {headerAction}
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#8DA3B8] hover:text-[#E8F0F7] font-mono text-sm px-1.5 hover:bg-[#142B42] rounded transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
};
