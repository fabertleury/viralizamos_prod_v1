import React, { useEffect, useState } from 'react';

const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consentGiven = localStorage.getItem('cookieConsent');
        if (!consentGiven) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="cookie-consent">
            <p>Este site utiliza cookies para melhorar a sua experiência. Ao continuar a navegar, você concorda com o uso de cookies.</p>
            <button onClick={handleAccept}>Aceitar</button>
        </div>
    );
};

export default CookieConsent;
