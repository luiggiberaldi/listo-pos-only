import React from 'react';
import ChangeCalculator from '../ChangeCalculator';

const ChangeProcessor = ({
    isVisible,
    cambioUSD,
    distVueltoUSD,
    distVueltoBS,
    handleVueltoDistChange,
    tasa,
    isCredited,
    onCreditChange,
    onUndoCredit,
    isTouch,
    onFocusInput
}) => {
    return (
        <div className={`absolute inset-0 w-full transition-all duration-500 ease-out ${isVisible
            ? 'opacity-100 scale-100 translate-y-0 z-10 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-4 z-0 pointer-events-none'
            }`}>
            <ChangeCalculator
                cambioUSD={cambioUSD}
                distVueltoUSD={distVueltoUSD}
                distVueltoBS={distVueltoBS}
                handleVueltoDistChange={handleVueltoDistChange}
                tasa={tasa}
                isCredited={isCredited}
                onCreditChange={onCreditChange}
                onUndoCredit={onUndoCredit}
                isTouch={isTouch}
                onFocusInput={onFocusInput}
            />
        </div>
    );
};

export default ChangeProcessor;
