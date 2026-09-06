import React from 'react';
import { LiveIntelDashboard } from './LiveIntelDashboard';
import DeepResearchDock from '../components/DeepResearchDock';

export const IntegratedIntelDashboard: React.FC = () => (
  <>
    <LiveIntelDashboard />
    <DeepResearchDock />
  </>
);
