// frontend/src/components/AnalysisDisplay.tsx
import React from 'react';
import { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
}

const AnalysisDisplay: React.FC<Props> = ({ result, isAnalyzing }) => {
  // Loading state
  if (!result && !isAnalyzing) {
    return (
      <div className="analysis-display">
        <div className="analysis-placeholder">
          <div className="placeholder-icon">🃏</div>
          <h3>Ready to Analyze Whatsnot Auctions</h3>
          <p>Select a region and start analysis to detect cards and calculate ROI</p>
          <div className="placeholder-features">
            <div className="feature-item">✨ Real-time OCR card detection</div>
            <div className="feature-item">💰 Live market data & pricing</div>
            <div className="feature-item">📊 ROI analysis & recommendations</div>
            <div className="feature-item">🎯 Deal quality assessment</div>
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing && !result) {
    return (
      <div className="analysis-display">
        <div className="analysis-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <h3>Analyzing Whatsnot Stream...</h3>
          <p>Detecting cards and fetching market data...</p>
          <div className="loading-steps">
            <div className="step active">🔍 OCR Processing</div>
            <div className="step">💾 Card Database Lookup</div>
            <div className="step">💰 Market Data Retrieval</div>
            <div className="step">📊 ROI Calculation</div>
          </div>
        </div>
      </div>
    );
  }

  // Extract data with proper type safety and null checks
  const cardInfo = (result as any)?.card_info || {};
  const auctionInfo = (result as any)?.auction_info || {};
  const roiAnalysis = (result as any)?.roi_analysis || {};
  const pricingData = (result as any)?.pricing_data || {};
  const marketTrends = (result as any)?.market_trends || {};
  
  // Utility functions
  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (percent: number | undefined | null): string => {
    if (percent === undefined || percent === null || isNaN(percent)) return '0.0%';
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const getRecommendationDetails = (rec: string | undefined) => {
    const recommendations: Record<string, { color: string; icon: string; text: string; description: string }> = {
      'STRONG_BUY': { 
        color: '#00C851', 
        icon: '🚀', 
        text: 'STRONG BUY',
        description: 'Excellent deal - well below market value'
      },
      'BUY': { 
        color: '#33b5e5', 
        icon: '👍', 
        text: 'BUY',
        description: 'Good value - below average market price'
      },
      'WEAK_BUY': { 
        color: '#ffbb33', 
        icon: '⚖️', 
        text: 'WEAK BUY',
        description: 'Fair deal - slight upside potential'
      },
      'WATCH': { 
        color: '#ff8800', 
        icon: '👀', 
        text: 'WATCH',
        description: 'Monitor closely - price at market value'
      },
      'PASS': { 
        color: '#ff4444', 
        icon: '❌', 
        text: 'PASS',
        description: 'Overpriced - above market value'
      },
      'INSUFFICIENT_DATA': {
        color: '#9e9e9e',
        icon: '🔍',
        text: 'SCANNING',
        description: 'Not enough market data for a signal'
      },
      'ANALYZING': {
        color: '#9e9e9e',
        icon: '🔄',
        text: 'ANALYZING',
        description: 'Processing market data...'
      }
    };
    return recommendations[rec || 'ANALYZING'] || recommendations['ANALYZING'];
  };

  const getGradeColor = (grade: string | undefined): string => {
    if (!grade) return '#9e9e9e';
    const gradeNum = parseInt(grade);
    if (gradeNum >= 10) return '#00C851';
    if (gradeNum >= 9) return '#33b5e5';
    if (gradeNum >= 8) return '#ffbb33';
    if (gradeNum >= 7) return '#ff8800';
    return '#ff4444';
  };

  const getDealQualityIndicator = (potential: number | undefined): { color: string, text: string } => {
    if (potential === undefined || potential === null) return { color: '#9e9e9e', text: 'Unknown' };
    if (potential >= 50) return { color: '#00C851', text: 'Excellent' };
    if (potential >= 25) return { color: '#33b5e5', text: 'Good' };
    if (potential >= 10) return { color: '#ffbb33', text: 'Fair' };
    if (potential >= 0) return { color: '#ff8800', text: 'Marginal' };
    return { color: '#ff4444', text: 'Poor' };
  };

  const recommendation = getRecommendationDetails(roiAnalysis?.recommendation);
  const dealQuality = getDealQualityIndicator(roiAnalysis?.roi_potential);

  const SIGNAL_COLORS: Record<string, string> = {
    GREEN: '#00C851',
    YELLOW: '#ffbb33',
    RED: '#ff4444',
    GRAY: '#9e9e9e',
  };
  const signal: string = roiAnalysis?.signal || 'GRAY';
  const bannerColor = SIGNAL_COLORS[signal] || SIGNAL_COLORS.GRAY;

  return (
    <div className="analysis-display">

      {/* ── Signal Banner ── */}
      <div
        className={`signal-banner signal-banner-${signal}`}
        style={{ backgroundColor: bannerColor }}
      >
        <div className="signal-label">
          {recommendation.icon} {recommendation.text}
        </div>
        <div className="signal-subline">
          <span>{cardInfo?.player_name || '—'}{cardInfo?.grade ? ` · ${cardInfo.grade}` : ''}</span>
          <span>Bid: {formatCurrency(auctionInfo?.current_bid)}</span>
          <span>Est: {formatCurrency(roiAnalysis?.fair_value_range?.estimated)}</span>
          <span>Max Bid: {formatCurrency(roiAnalysis?.suggested_max_bid)}</span>
          <span>Confidence: {Math.round((roiAnalysis?.confidence || 0) * 100)}%</span>
        </div>
        {roiAnalysis?.insufficient_data_reason && (
          <div className="signal-warning">{roiAnalysis.insufficient_data_reason}</div>
        )}
        <div className="confidence-bar-container">
          <div
            className="confidence-bar-fill"
            style={{ width: `${Math.round((roiAnalysis?.confidence || 0) * 100)}%` }}
          />
        </div>
      </div>
      {/* Card Information Section */}
      <div className="analysis-section card-section">
        <div className="section-header">
          <h3>🃏 Card Detected</h3>
          <div className="confidence-badge">
            {Math.round((result?.confidence || 0) * 100)}% confident
          </div>
        </div>
        
        <div className="card-details">
          <div className="card-info-grid">
            <div className="info-item">
              <span className="label">Player:</span>
              <span className="value player-name">
                {cardInfo?.player_name || 'Unknown Player'}
              </span>
            </div>
            
            <div className="info-item">
              <span className="label">Year:</span>
              <span className="value">{cardInfo?.year || 'Unknown'}</span>
            </div>
            
            <div className="info-item">
              <span className="label">Set:</span>
              <span className="value">{cardInfo?.set_name || 'Unknown Set'}</span>
            </div>
            
            <div className="info-item">
              <span className="label">Card #:</span>
              <span className="value">{cardInfo?.card_number || 'N/A'}</span>
            </div>
            
            <div className="info-item">
              <span className="label">Grade:</span>
              <span 
                className="value grade-badge"
                style={{ 
                  backgroundColor: getGradeColor(cardInfo?.grade),
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}
              >
                {cardInfo?.grade || 'Raw/Ungraded'}
              </span>
            </div>
            
            <div className="info-item">
              <span className="label">Parallel:</span>
              <span className="value">{cardInfo?.parallel || 'Base'}</span>
            </div>
          </div>
          
          {cardInfo?.rookie && (
            <div className="special-badges">
              <div className="rookie-badge">🌟 ROOKIE CARD</div>
            </div>
          )}
          
          {cardInfo?.auto && (
            <div className="special-badges">
              <div className="auto-badge">✍️ AUTOGRAPH</div>
            </div>
          )}
        </div>
      </div>

      {/* Auction Information Section */}
      <div className="analysis-section auction-section">
        <div className="section-header">
          <h3>🔨 Live Auction Status</h3>
          <div className="auction-status live">
            <span className="status-dot"></span>
            LIVE
          </div>
        </div>
        
        <div className="auction-details">
          <div className="current-bid-display">
            <div className="bid-label">Current Bid</div>
            <div className="bid-amount">
              {formatCurrency(auctionInfo?.current_bid)}
            </div>
          </div>
          
          <div className="auction-meta">
            <div className="meta-item">
              <span className="meta-label">⏱️ Time Left:</span>
              <span className="meta-value">
                {auctionInfo?.time_remaining || 'Unknown'}
              </span>
            </div>
            
            <div className="meta-item">
              <span className="meta-label">👥 Total Bids:</span>
              <span className="meta-value">{auctionInfo?.bid_count || 0}</span>
            </div>
            
            <div className="meta-item">
              <span className="meta-label">📈 Bid Activity:</span>
              <span className="meta-value">
                {auctionInfo?.bidding_velocity || 'Normal'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Analysis Section */}
      <div className="analysis-section roi-section">
        <div className="section-header">
          <h3>💰 Deal Analysis</h3>
          <div className="deal-quality" style={{ color: dealQuality.color }}>
            {dealQuality.text} Deal
          </div>
        </div>
        
        <div 
          className="recommendation-card"
          style={{ 
            borderLeft: `4px solid ${recommendation.color}`,
            backgroundColor: `${recommendation.color}10`
          }}
        >
          <div className="recommendation-header">
            <span className="rec-icon">{recommendation.icon}</span>
            <div className="rec-details">
              <div 
                className="rec-text"
                style={{ color: recommendation.color }}
              >
                {recommendation.text}
              </div>
              <div className="rec-description">
                {recommendation.description}
              </div>
            </div>
            <div className="confidence-score">
              <div className="confidence-label">Confidence</div>
              <div className="confidence-value">
                {Math.round((roiAnalysis?.confidence || 0) * 100)}%
              </div>
            </div>
          </div>
        </div>
        
        <div className="roi-metrics-grid">
          <div className="metric-card">
            <div className="metric-label">ROI Potential</div>
            <div 
              className={`metric-value ${(roiAnalysis?.roi_potential || 0) >= 0 ? 'positive' : 'negative'}`}
            >
              {formatPercentage(roiAnalysis?.roi_potential)}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Suggested Max Bid</div>
            <div className="metric-value suggested-max">
              {formatCurrency(roiAnalysis?.suggested_max_bid)}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Break-even Price</div>
            <div className="metric-value break-even">
              {formatCurrency(roiAnalysis?.break_even_price)}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Profit Margin</div>
            <div 
              className={`metric-value ${(roiAnalysis?.profit_margin || 0) >= 0 ? 'positive' : 'negative'}`}
            >
              {formatCurrency(roiAnalysis?.profit_margin)}
            </div>
          </div>
        </div>

        {/* Fair Value Range */}
        {roiAnalysis?.fair_value_range && (
          <div className="fair-value-range">
            <div className="range-label">Fair Value Range</div>
            <div className="range-bar">
              <div className="range-min">
                {formatCurrency(roiAnalysis?.fair_value_range?.min)}
              </div>
              <div className="range-visual">
                <div className="range-track">
                  <div 
                    className="current-bid-marker"
                    style={{
                      left: `${Math.min(100, Math.max(0, 
                        ((auctionInfo?.current_bid || 0) - (roiAnalysis?.fair_value_range?.min || 0)) / 
                        ((roiAnalysis?.fair_value_range?.max || 1) - (roiAnalysis?.fair_value_range?.min || 0)) * 100
                      ))}%`
                    }}
                  >
                    Current Bid
                  </div>
                </div>
              </div>
              <div className="range-max">
                {formatCurrency(roiAnalysis?.fair_value_range?.max)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Market Data Section */}
      {pricingData?.prices && pricingData?.prices?.length > 0 && (
        <div className="analysis-section market-section">
          <div className="section-header">
            <h3>📈 Market Intelligence</h3>
            <div className="data-freshness">
              Updated {marketTrends?.last_updated || 'recently'}
            </div>
          </div>
          
          <div className="market-overview">
            <div className="market-stats-grid">
              <div className="stat-card primary">
                <div className="stat-label">Market Average</div>
                <div className="stat-value">
                  {formatCurrency(pricingData?.average)}
                </div>
                <div className="stat-trend">
                  {marketTrends?.price_trend && (
                    <span className={`trend ${(marketTrends?.price_trend || 0) > 0 ? 'up' : 'down'}`}>
                      {(marketTrends?.price_trend || 0) > 0 ? '📈' : '📉'} 
                      {formatPercentage(marketTrends?.price_trend)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Median Price</div>
                <div className="stat-value">
                  {formatCurrency(pricingData?.median)}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Price Range</div>
                <div className="stat-value range">
                  {formatCurrency(pricingData?.min)} - {formatCurrency(pricingData?.max)}
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Sample Size</div>
                <div className="stat-value">{pricingData?.count || 0} sales</div>
                <div className="stat-note">
                  {pricingData?.timeframe || 'Last 90 days'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Sales */}
          <div className="recent-sales">
            <h4>Recent Comparable Sales</h4>
            <div className="sales-timeline">
              {pricingData?.prices?.slice(0, 8).map((price: number, index: number) => (
                <div key={index} className="sale-item">
                  <div className="sale-price">{formatCurrency(price)}</div>
                  <div className="sale-date">
                    {pricingData?.sale_dates?.[index] || `${index + 1} days ago`}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Market Indicators */}
          {marketTrends?.volatility !== undefined && (
            <div className="market-indicators">
              <div className="indicator">
                <span className="indicator-label">Market Volatility:</span>
                <span className={`indicator-value ${(marketTrends?.volatility || 0) > 0.3 ? 'high' : (marketTrends?.volatility || 0) > 0.15 ? 'medium' : 'low'}`}>
                  {(marketTrends?.volatility || 0) > 0.3 ? 'High' : (marketTrends?.volatility || 0) > 0.15 ? 'Medium' : 'Low'}
                </span>
              </div>
              
              <div className="indicator">
                <span className="indicator-label">Liquidity:</span>
                <span className={`indicator-value ${(pricingData?.count || 0) > 20 ? 'high' : (pricingData?.count || 0) > 10 ? 'medium' : 'low'}`}>
                  {(pricingData?.count || 0) > 20 ? 'High' : (pricingData?.count || 0) > 10 ? 'Medium' : 'Low'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key Factors Section */}
      {roiAnalysis?.key_factors && roiAnalysis?.key_factors?.length > 0 && (
        <div className="analysis-section factors-section">
          <div className="section-header">
            <h3>🔍 Key Decision Factors</h3>
          </div>
          
          <div className="factors-list">
            {roiAnalysis?.key_factors?.map((factor: string, index: number) => (
              <div key={index} className="factor-item">
                <span className="factor-icon">
                  {factor.includes('price') || factor.includes('value') ? '💰' :
                   factor.includes('grade') || factor.includes('condition') ? '🏆' :
                   factor.includes('rookie') || factor.includes('auto') ? '⭐' :
                   factor.includes('market') || factor.includes('trend') ? '📊' :
                   factor.includes('risk') ? '⚠️' : '📌'}
                </span>
                <span className="factor-text">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      {roiAnalysis?.risk_factors && (
        <div className="analysis-section risk-section">
          <div className="section-header">
            <h3>⚠️ Risk Assessment</h3>
            <div className={`risk-level ${roiAnalysis?.risk_level || 'medium'}`}>
              {(roiAnalysis?.risk_level || 'medium').toUpperCase()} RISK
            </div>
          </div>
          
          <div className="risk-factors">
            {roiAnalysis?.risk_factors?.map((risk: string, index: number) => (
              <div key={index} className="risk-item">
                <span className="risk-icon">⚠️</span>
                <span className="risk-text">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Sources Footer */}
      <div className="analysis-footer">
        <div className="data-sources">
          <span className="sources-label">Data Sources:</span>
          <div className="sources-list">
            {pricingData?.sources?.map((source: string, index: number) => (
              <span key={index} className="source-badge">{source}</span>
            )) || (
              <>
                <span className="source-badge">eBay Sold</span>
                <span className="source-badge">PSA APR</span>
                <span className="source-badge">130Point</span>
              </>
            )}
          </div>
        </div>

        <div className="analysis-timestamp">
          <span>Last updated: {new Date(result?.timestamp || Date.now()).toLocaleTimeString()}</span>
        </div>
      </div>

    </div>
  );
};

export default AnalysisDisplay;