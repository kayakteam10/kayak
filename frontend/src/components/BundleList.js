// Bundle Display Components
import React from 'react';
import BundleCard from './BundleCard';
import './BundleList.css';

const BundleList = ({ bundles, onSelectBundle, onTrackBundle }) => {
    if (!bundles || bundles.length === 0) {
        return (
            <div className="bundle-list-empty">
                <p>No bundles available yet. Tell me about your trip!</p>
            </div>
        );
    }

    return (
        <div className="bundle-list">
            {bundles.map((bundle) => (
                <BundleCard
                    key={bundle.bundle_id}
                    bundle={bundle}
                    onBook={() => onSelectBundle && onSelectBundle(bundle)}
                    onTrack={() => onTrackBundle && onTrackBundle(bundle)}
                />
            ))}
        </div>
    );
};

export default BundleList;
