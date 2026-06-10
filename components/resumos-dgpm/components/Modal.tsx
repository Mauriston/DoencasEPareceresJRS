
import React from 'react';
import Icon from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-gray-50-light w-full max-w-3xl rounded-lg shadow-2xl border border-gray-200 p-6 relative transform transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
          <h2 id="modal-title" className="font-heading text-md text-navy">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-navy transition-colors" aria-label="Fechar modal">
            <Icon name="close" className="text-md" />
          </button>
        </div>
        <div className="text-gray-600 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
