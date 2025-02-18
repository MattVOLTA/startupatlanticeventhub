import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <a href="https://www.startupatlantic.ca" rel="noopener noreferrer">
      <svg
        className={className}
        viewBox="0 0 1957.83 440.16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="linear-gradient" x1="1518.18" y1="88.47" x2="1736.33" y2="88.47" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f47e45"/>
            <stop offset=".22" stopColor="#e66639"/>
            <stop offset=".48" stopColor="#da522f"/>
            <stop offset=".74" stopColor="#d34629"/>
            <stop offset="1" stopColor="#d14227"/>
          </linearGradient>
        </defs>
        <g>
          <path fill="#fff" d="M368.63,421.14v13.9h-181.87v-13.9c30.72-4.88,37.06-15.36,23.41-57.54l-15.12-46.56h-105.08l-13.65,43.4c-14.14,45.1-8.53,55.35,23.89,60.71v13.9H0v-13.9c24.87-4.88,32.92-13.65,49.98-61.68L147.75,82.5h74.6l98.99,284.28c14.14,39.98,22.67,49.49,47.29,54.37ZM188.71,297.53l-46.81-144.58-45.84,144.58h92.65Z"/>
          <path fill="#fff" d="M389.41,214.88h-26.33v-12.44l109.72-78.75h11.94v69.97l55.59-4.14v25.36l-55.59-4.15v150.18c0,30.96,12.68,43.4,32.42,43.4,10.49,0,20-3.9,25.85-9.02v13.9c-11.22,16.09-40.96,30.96-74.85,30.96-44.86,0-78.75-23.41-78.75-80.21v-145.06Z"/>
          <path fill="#fff" d="M681.19,393.35c0,18.04,4.39,23.41,27.31,27.79v13.9h-150.91v-13.9c22.91-4.38,27.31-9.75,27.31-27.79V125.89c0-17.31-1.95-20.97-15.85-25.84l-11.46-3.9v-13.17l123.61-15.36v325.72Z"/>
          <path fill="#fff" d="M731.47,381.15c0-37.06,28.52-63.39,107.52-78.5l46.81-9.27v-25.6c0-43.88-20.48-61.2-58.75-61.2-10.49,0-20.48,1.71-29.5,4.88,15.6,4.88,27.06,19.26,27.06,36.82,0,22.19-18.28,39.5-41.44,39.5s-40.96-16.33-40.96-38.28c0-35.35,42.91-64.85,117.27-64.85s120.19,27.06,120.19,87.28v112.88c0,19.75,9.75,28.28,22.19,28.28,3.41,0,6.83-.49,9.02-1.22v13.16c-11.21,7.8-32.42,13.9-56.07,13.9-31.94,0-62.41-14.38-67.29-42.66-8.53,26.81-41.45,43.88-83.87,43.88s-72.17-23.65-72.17-59ZM855.32,404.8c14.63,0,25.6-6.83,30.47-18.77v-77.04l-12.44,2.68c-35.11,8.53-48.27,27.31-48.27,54.85,0,25.11,12.92,38.28,30.23,38.28Z"/>
          <path fill="#fff" d="M1150.03,233.17c11.7-28.77,42.66-48.52,86.55-48.52,50.71,0,84.6,25.84,84.6,79.97v128.73c0,18.04,4.39,23.41,27.31,27.79v13.9h-146.04v-13.9c19.02-3.9,22.68-8.53,22.68-26.09v-128.48c0-28.77-13.9-42.91-38.03-42.91-17.07,0-30.48,8.04-36.33,19.75v151.65c0,17.55,3.17,22.18,22.43,26.09v13.9h-146.04v-13.9c22.91-4.38,27.31-9.75,27.31-27.79v-149.21c0-17.31-1.95-21.21-15.85-26.09l-11.46-3.66v-13.16l122.88-15.36v47.3Z"/>
          <path fill="#fff" d="M1374.4,214.88h-26.33v-12.44l109.72-78.75h11.94v69.97l55.59-4.14v25.36l-55.59-4.15v150.18c0,30.96,12.68,43.4,32.42,43.4,10.49,0,20-3.9,25.85-9.02v13.9c-11.22,16.09-40.96,30.96-74.85,30.96-44.86,0-78.75-23.41-78.75-80.21v-145.06Z"/>
          <path fill="#fff" d="M1677.26,393.35c0,18.04,4.39,23.41,27.31,27.79v13.9h-150.91v-13.9c22.91-4.38,27.31-9.75,27.31-27.79v-149.21c0-17.31-1.95-21.21-15.85-26.09l-11.46-3.66v-13.16l123.61-15.36v207.48Z"/>
          <path fill="#fff" d="M1717.2,313.13c0-76.8,59.73-128.48,141.16-128.48,61.93,0,99.23,29.26,99.23,68.02,0,24.63-18.77,41.93-41.2,41.93s-40.96-17.55-40.96-39.98,16.58-39.25,37.54-40.23c-8.04-3.9-17.31-6.09-27.31-6.09-41.44,0-69.72,33.64-69.72,88.26,0,66.07,39.25,103.37,87.04,103.37,21.45,0,43.15-7.31,54.85-18.28v13.9c-19.5,27.31-58.51,44.62-104.35,44.62-74.85,0-136.28-47.54-136.28-127.02Z"/>
        </g>
        <g>
          <path fill="#f1b434" d="M819.02,30.85c-5.92-5.33-11.01-5.68-13.26-5.68-2.48,0-5.56.35-7.69,2.72-1.18,1.18-2.01,2.96-2.01,4.97,0,1.89.59,3.31,1.78,4.38,1.89,1.77,4.62,2.48,9.94,4.5l5.92,2.25c3.43,1.3,7.69,3.08,10.77,6.04,4.62,4.38,5.8,10.06,5.8,14.67,0,8.17-2.84,15.27-6.98,19.53-6.98,7.34-17.16,8.05-22.37,8.05-5.68,0-10.65-.83-15.62-3.31-4.02-2.02-8.64-5.68-11.6-8.64l9.47-13.02c2.01,2.01,5.21,4.73,7.34,6.03,3.08,1.9,6.27,2.84,9.94,2.84,2.37,0,5.68-.47,8.28-2.72,1.54-1.3,2.84-3.43,2.84-6.39,0-2.6-1.07-4.26-2.72-5.68-2.13-1.77-6.98-3.55-9.23-4.38l-6.51-2.25c-3.67-1.3-7.93-2.96-11.01-6.27-4.14-4.38-4.73-9.94-4.73-13.73,0-6.98,2.13-12.9,6.86-17.75,5.56-5.68,12.19-7.22,19.53-7.22,5.44,0,14.2.95,23.43,7.81l-8.16,13.26Z"/>
          <path fill="#f1b434" d="M894.77,26.94v63.56h-18.23V26.94h-17.16v-15.38h52.55v15.38h-17.16Z"/>
          <path fill="#f1b434" d="M986.61,75.59h-29.82l-6.04,14.91h-18.94l31.84-78.94h16.69l31.13,78.94h-18.94l-5.92-14.91ZM981.64,61.62l-9.71-26.51-9.82,26.51h19.53Z"/>
          <path fill="#f1b434" d="M1071.71,11.56c10.06,0,16.33,3.31,20.12,6.86,3.31,3.2,6.86,8.88,6.86,17.63,0,4.97-1.07,11.12-6.15,16.1-2.72,2.6-6.63,4.97-11.01,6.03l24.26,32.31h-22.25l-21.3-31.13v31.13h-18.23V11.56h27.69ZM1062.24,47.42h4.14c3.31,0,7.81-.36,10.89-3.43,1.3-1.3,2.96-3.79,2.96-7.69,0-4.5-2.13-6.87-3.67-8.05-2.96-2.25-7.69-2.48-10.06-2.48h-4.26v21.66Z"/>
          <path fill="#f1b434" d="M1164.73,26.94v63.56h-18.23V26.94h-17.16v-15.38h52.55v15.38h-17.16Z"/>
          <path fill="#f1b434" d="M1281.9,58.31c0,7.57-.95,16.93-8.76,24.97-7.57,7.81-16.33,8.99-24.62,8.99s-17.04-1.18-24.62-8.99c-7.81-8.05-8.76-17.4-8.76-24.97V11.56h18.23v46.27c0,3.43.24,9.23,4.14,13.26,3.2,3.43,7.57,4.14,11.01,4.14s7.81-.71,11.01-4.14c3.91-4.02,4.14-9.82,4.14-13.26V11.56h18.22v46.75Z"/>
          <path fill="#f1b434" d="M1350.67,11.56c6.86,0,14.44.95,20.71,6.51,6.75,5.92,7.69,13.73,7.69,19.17,0,9.94-3.79,15.5-6.75,18.58-6.27,6.39-14.56,6.98-20.12,6.98h-11.12v27.7h-18.23V11.56h27.81ZM1341.08,47.89h6.51c2.48,0,6.86-.12,9.82-2.96,1.66-1.66,2.96-4.38,2.96-7.81s-1.18-6.04-2.96-7.69c-2.72-2.6-6.63-2.96-10.18-2.96h-6.15v21.42Z"/>
        </g>
        <path fill="url(#linear-gradient)" d="M1576.65,176.94l100.43-12.72c.28-.04.44-.35.31-.6l-8.19-15.14c-.13-.24,0-.53.27-.59l65.82-15.31c.26-.06.39-.35.27-.59l-9.83-18.71c-.05-.1-.06-.21-.03-.32l10.6-31.71c.09-.26-.1-.52-.37-.54l-32.78-1.66c-.11,0-.22-.06-.29-.15l-16.31-19.81c-.14-.17-.38-.2-.56-.07l-28.62,21.15c-.32.24-.76-.09-.63-.47l16.99-47.32c.1-.26-.1-.54-.38-.55l-26.06-.12c-.14,0-.27-.07-.35-.19l-19.15-31.22c-.25-.41-.85-.41-1.1,0l-19.15,31.23c-.07.12-.2.19-.35.19l-25.96.12c-.27,0-.47.26-.39.53l13.35,44.44c.11.38-.32.68-.64.44l-25.31-19.08c-.18-.14-.43-.1-.57.08l-15.51,20.37c-.07.09-.17.15-.29.16l-33.35,3c-.27.02-.44.29-.35.54l10.65,29.98c.04.11.03.23-.03.34l-10.55,18.84c-.13.22-.01.51.23.59l60.96,19.59c.19.06.31.25.28.45l-3.55,24.36c-.04.27.19.5.45.46Z"/>
      </svg>
    </a>
  );
}