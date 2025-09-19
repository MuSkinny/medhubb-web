"use client";

import { useState, useEffect } from 'react';

interface SectionTransitionOptions {
  minLoadingTime?: number; // Tempo minimo di caricamento in ms
  transitionDuration?: number; // Durata della transizione in ms
}

export function useSectionTransition(options: SectionTransitionOptions = {}) {
  const { minLoadingTime = 800, transitionDuration = 300 } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startSectionTransition = async (sectionName: string, loadingFunction?: () => Promise<void>) => {
    setIsLoading(true);
    setCurrentSection(sectionName);
    setIsTransitioning(true);

    const startTime = Date.now();

    try {
      // Esegui la funzione di caricamento se fornita
      if (loadingFunction) {
        await loadingFunction();
      }

      // Assicurati che sia passato il tempo minimo
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

    } catch (error) {
      console.error('Errore durante il caricamento della sezione:', error);
    } finally {
      // Transizione di uscita
      setTimeout(() => {
        setIsLoading(false);
        setIsTransitioning(false);
      }, transitionDuration);
    }
  };

  return {
    isLoading,
    currentSection,
    isTransitioning,
    startSectionTransition
  };
}

// Hook per gestire lo stato globale delle sezioni nelle dashboard
export function useDashboardSections() {
  const [activeSection, setActiveSection] = useState<string>('');
  const [sectionData, setSectionData] = useState<Record<string, unknown>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const updateSectionData = (section: string, data: unknown) => {
    setSectionData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  const setSectionLoading = (section: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [section]: loading
    }));
  };

  const isSectionLoading = (section: string) => {
    return loadingStates[section] || false;
  };

  const getSectionData = (section: string) => {
    return sectionData[section];
  };

  return {
    activeSection,
    setActiveSection,
    sectionData,
    updateSectionData,
    setSectionLoading,
    isSectionLoading,
    getSectionData
  };
}
