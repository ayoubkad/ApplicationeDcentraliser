import React, { useState } from 'react';
import { BookOpen, Menu, X } from 'lucide-react';
import MetaMaskConnect from './MetaMaskConnect';
import web3Service from '../Web3Service';

const Header = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-2xl font-bold text-[#2A3B8C] mr-2">
            <BookOpen size={28} className="inline mr-2" />
            <a 
              href="#" 
              onClick={(e) => { 
                e.preventDefault(); 
                setActiveTab('home'); 
              }} 
              className="hover:text-[#1F2D6B] transition"
            >
              BiblioChain
            </a>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-6">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-2 ${activeTab === 'home' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'home' ? 'page' : undefined}
          >
            Accueil
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-2 ${activeTab === 'catalog' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'catalog' ? 'page' : undefined}
          >
            Catalogue
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-2 ${activeTab === 'dashboard' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            Mon Espace
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-2 ${activeTab === 'admin' ? 'text-[#6A1B9A] border-b-2 border-[#6A1B9A]' : 'text-gray-600'}`}
            aria-current={activeTab === 'admin' ? 'page' : undefined}
          >
            Admin
          </button>
        </div>

        <div className="flex items-center">
          <MetaMaskConnect
            web3Service={web3Service}
          />
          <button
            className="md:hidden ml-4 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-2">
            <button
              onClick={() => {
                setActiveTab('home');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 ${activeTab === 'home' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
            >
              Accueil
            </button>
            <button
              onClick={() => {
                setActiveTab('catalog');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 ${activeTab === 'catalog' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
            >
              Catalogue
            </button>
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 ${activeTab === 'dashboard' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
            >
              Mon Espace
            </button>
            <button
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 ${activeTab === 'admin' ? 'text-[#6A1B9A] font-medium' : 'text-gray-600'}`}
            >
              Admin
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;