import React from 'react';
import { LiveIntelDashboard } from './LiveIntelDashboard';
import DeepResearchDockV3 from '../components/DeepResearchDockV3';

export const IntegratedIntelDashboard: React.FC = () => (
  <>
    <LiveIntelDashboard />
    <DeepResearchDockV3 />
  </>
);
