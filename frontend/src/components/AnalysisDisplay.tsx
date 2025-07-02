import React from 'react';
import { AnalysisResult } from '../types';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface AnalysisDisplayProps {
  result: AnalysisResult | null;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="analysis-display">
        <p>Waiting for analysis results...</p>
      </div>
    );
  }
  
  const { ocr, pricing } = result;
  const { card_info } = ocr;
  
  // Calculate deal rating
  const getDealRating = () => {
    if (!pricing.average || !pricing.median) return 'N/A';
    // This is a simple example - enhance with your logic
    const ratio = pricing.min / pricing.average;
    if (ratio < 0.7) return 'Great Deal';
    if (ratio < 0.85) return 'Good Deal';
    return 'Fair Price';
  };
  
  return (
    <div className="analysis-display">
      <h3>Card Analysis</h3>
      
      <div className="card-info">
        <h4>Card Details</h4>
        <p><strong>Player:</strong> {card_info.player_name || 'Unknown'}</p>
        <p><strong>Year:</strong> {card_info.year || 'Unknown'}</p>
        <p><strong>Set:</strong> {card_info.set_name || 'Unknown'}</p>
        <p><strong>Grade:</strong> {card_info.grade || 'Raw'}</p>
        <p><strong>OCR Confidence:</strong> {(ocr.confidence * 100).toFixed(1)}%</p>
      </div>
      
      <div className="pricing-info">
        <h4>Market Analysis</h4>
        {pricing.error ? (
          <p className="error">Error: {pricing.error}</p>
        ) : (
          <>
            <div className="price-stat">
              <DollarSign />
              <span>Average: ${pricing.average.toFixed(2)}</span>
            </div>
            <div className="price-stat">
              <span>Median: ${pricing.median.toFixed(2)}</span>
            </div>
            <div className="price-stat">
              <TrendingDown />
              <span>Low: ${pricing.min.toFixed(2)}</span>
            </div>
            <div className="price-stat">
              <TrendingUp />
              <span>High: ${pricing.max.toFixed(2)}</span>
            </div>
            <div className="price-stat">
              <span>Sample Size: {pricing.count} sales</span>
            </div>
            
            <div className="deal-rating">
              <h5>Deal Rating: {getDealRating()}</h5>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalysisDisplay;
