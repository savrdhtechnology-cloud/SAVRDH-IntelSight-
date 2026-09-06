import React from 'react';
import { LiveIntelDashboard } from './LiveIntelDashboard';
import DeepResearchDockV2 from '../components/DeepResearchDockV2';

export const IntegratedIntelDashboard: React.FC = () => (
  <>
    <LiveIntelDashboard />
    <DeepResearchDockV2 />
  </>
);
