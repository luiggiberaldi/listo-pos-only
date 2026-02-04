
import React, { useEffect } from 'react';
import { timeProvider } from '../../utils/TimeProvider';

/**
 * GhostEye - The All-Seeing Eye 👁️
 * Captures global user interactions for the Ghost Nervous System.
 * Renders nothing (invisible).
 */
export const GhostEye = () => {
    useEffect(() => {
        const handleClick = (e) => {
            // 1. Identify Target
            const el = e.target;

            // Heuristic Identity Resolution
            const testId = el.getAttribute('data-testid');
            const id = el.id;
            let text = el.innerText?.substring(0, 30); // Cap text length
            if (text) text = text.replace(/\n/g, ' ').trim();
            const tag = el.tagName;

            // Priority: data-testid > id > text > tag
            let selector = tag.toLowerCase();
            if (testId) selector += `[data-testid="${testId}"]`;
            else if (id) selector += `#${id}`;
            else if (text) selector += `:contains("${text}")`;

            // 2. Capture Metadata (Coords needed for Remotion cursor)
            const meta = {
                x: e.clientX,
                y: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                path: window.location.hash
            };

            // 3. Log to Global Buffer
            if (window.GhostBuffer) {
                window.GhostBuffer.push({
                    type: 'USER_INTERACTION',
                    event: 'CLICK',
                    timestamp: timeProvider.toISOString(),
                    realTimestamp: Date.now(),
                    target: selector,
                    meta
                });
            }
        };

        // Capture Phase (true) ensures we see the event before stopPropagation stops it
        window.addEventListener('click', handleClick, true);

        return () => {
            window.removeEventListener('click', handleClick, true);
        };
    }, []);

    return null; // Invisible Component
};
