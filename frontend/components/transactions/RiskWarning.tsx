'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Info, 
  ChevronRight,
  Flame,
  TrendingDown,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  id: string;
  type: 'price-impact' | 'slippage' | 'liquidity' | 'smart-contract' | 'impermanent-loss' | 'health-factor' | 'oracle' | 'bridge' | 'protocol' | 'market';
  severity: RiskLevel;
  title: string;
  description: string;
  impact?: string;
  mitigation?: string;
}

export interface RiskAssessmentData {
  level: RiskLevel;
  score: number; // 0-100
  factors: RiskFactor[];
  summary: string;
  recommendations: string[];
  protocolAudits?: {
    name: string;
    date: string;
    auditor: string;
    reportUrl?: string;
  }[];
}

interface RiskWarningProps {
  assessment: RiskAssessmentData;
  showDetails?: boolean;
  onAcceptRisk?: () => void;
  onRejectRisk?: () => void;
  requiresAcknowledgment?: boolean;
  className?: string;
}

export function RiskWarning({
  assessment,
  showDetails: initialShowDetails = false,
  onAcceptRisk,
  onRejectRisk,
  requiresAcknowledgment = false,
  className = ''
}: RiskWarningProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [acknowledged, setAcknowledged] = useState(false);
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set());

  const getRiskConfig = (level: RiskLevel) => {
    switch (level) {
      case 'low':
        return {
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          textColor: 'text-green-400',
          icon: <ShieldCheck className="w-5 h-5" />,
          label: 'Low Risk'
        };
      case 'medium':
        return {
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
          textColor: 'text-yellow-400',
          icon: <Shield className="w-5 h-5" />,
          label: 'Medium Risk'
        };
      case 'high':
        return {
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20',
          textColor: 'text-orange-400',
          icon: <ShieldAlert className="w-5 h-5" />,
          label: 'High Risk'
        };
      case 'critical':
        return {
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          textColor: 'text-red-400',
          icon: <ShieldX className="w-5 h-5" />,
          label: 'Critical Risk'
        };
    }
  };

  const getFactorIcon = (type: string) => {
    switch (type) {
      case 'price-impact':
        return <TrendingDown className="w-4 h-4" />;
      case 'slippage':
        return <AlertCircle className="w-4 h-4" />;
      case 'liquidity':
        return <Flame className="w-4 h-4" />;
      case 'smart-contract':
        return <ShieldAlert className="w-4 h-4" />;
      case 'health-factor':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const toggleFactor = (factorId: string) => {
    setExpandedFactors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(factorId)) {
        newSet.delete(factorId);
      } else {
        newSet.add(factorId);
      }
      return newSet;
    });
  };

  const config = getRiskConfig(assessment.level);
  const highRiskFactors = assessment.factors.filter(f => f.severity === 'high' || f.severity === 'critical');
  const showAcknowledgment = requiresAcknowledgment && (assessment.level === 'high' || assessment.level === 'critical');

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg ${className}`}>
      {/* Main Risk Summary */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`${config.textColor} mt-0.5`}>
              {config.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold ${config.textColor}`}>
                  {config.label}
                </h3>
                <span className="text-gray-400 text-sm">
                  (Score: {assessment.score}/100)
                </span>
              </div>
              <p className="text-gray-300 text-sm">
                {assessment.summary}
              </p>
              
              {/* Quick warning for high risk factors */}
              {highRiskFactors.length > 0 && !showDetails && (
                <div className="mt-2 space-y-1">
                  {highRiskFactors.slice(0, 2).map(factor => (
                    <div key={factor.id} className="flex items-center gap-2 text-sm">
                      <span className={getRiskConfig(factor.severity).textColor}>
                        {getFactorIcon(factor.type)}
                      </span>
                      <span className="text-gray-400">{factor.title}</span>
                    </div>
                  ))}
                  {highRiskFactors.length > 2 && (
                    <p className="text-gray-500 text-sm">
                      +{highRiskFactors.length - 2} more risk factors
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-white transition-colors ml-4"
          >
            <ChevronRight className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Detailed Risk Factors */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-red-500/10">
              {/* Risk Factors */}
              <div className="mt-4">
                <h4 className="text-white font-medium mb-3">Risk Factors</h4>
                <div className="space-y-2">
                  {assessment.factors.map(factor => {
                    const factorConfig = getRiskConfig(factor.severity);
                    const isExpanded = expandedFactors.has(factor.id);
                    
                    return (
                      <div
                        key={factor.id}
                        className={`${factorConfig.bgColor} ${factorConfig.borderColor} border rounded-lg p-3`}
                      >
                        <button
                          onClick={() => toggleFactor(factor.id)}
                          className="w-full flex items-start justify-between text-left"
                        >
                          <div className="flex items-start space-x-2">
                            <span className={`${factorConfig.textColor} mt-0.5`}>
                              {getFactorIcon(factor.type)}
                            </span>
                            <div>
                              <p className="text-white font-medium text-sm">{factor.title}</p>
                              <p className="text-gray-400 text-sm mt-0.5">{factor.description}</p>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (factor.impact || factor.mitigation) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 pl-6 space-y-2 text-sm"
                            >
                              {factor.impact && (
                                <div>
                                  <p className="text-gray-500">Potential Impact:</p>
                                  <p className="text-gray-300">{factor.impact}</p>
                                </div>
                              )}
                              {factor.mitigation && (
                                <div>
                                  <p className="text-gray-500">Mitigation:</p>
                                  <p className="text-gray-300">{factor.mitigation}</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations */}
              {assessment.recommendations.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {assessment.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Protocol Audits */}
              {assessment.protocolAudits && assessment.protocolAudits.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-2">Security Audits</h4>
                  <div className="space-y-2">
                    {assessment.protocolAudits.map((audit, index) => (
                      <div key={index} className="bg-black/30 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{audit.name}</p>
                            <p className="text-gray-400">by {audit.auditor} • {audit.date}</p>
                          </div>
                          {audit.reportUrl && (
                            <a
                              href={audit.reportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              View Report
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Acknowledgment */}
              {showAcknowledgment && (
                <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="mt-1 w-4 h-4 text-red-600 bg-gray-900 border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">
                      I understand and accept the risks associated with this transaction. 
                      I acknowledge that I may lose some or all of my funds.
                    </span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              {(onAcceptRisk || onRejectRisk) && (
                <div className="flex space-x-3 mt-4">
                  {onRejectRisk && (
                    <button
                      onClick={onRejectRisk}
                      className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Cancel Transaction
                    </button>
                  )}
                  {onAcceptRisk && (
                    <button
                      onClick={onAcceptRisk}
                      disabled={showAcknowledgment && !acknowledged}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    >
                      Proceed with Transaction
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}