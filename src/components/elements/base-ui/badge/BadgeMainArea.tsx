import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import ThemePrimaryBadge from './ThemePrimaryBadge';
import BadgesWithoutBorder from './BadgesWithoutBorder';
import LightBadgesBorder from './LightBadgesBorder';
import LightBadges from './LightBadges';
import ButtonsWithBadge from './ButtonsWithBadge';
import ButtonWithIconBadge from './ButtonWithIconBadge';

const BadgeMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb subTitle='Ui Elements' breadTitle='Badge' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-6">
                        <ThemePrimaryBadge />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <BadgesWithoutBorder />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <LightBadgesBorder />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <LightBadges />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <ButtonWithIconBadge />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <ButtonsWithBadge />
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default BadgeMainArea;