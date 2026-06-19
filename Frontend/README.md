# Environmental Monitoring Web App

A React-based web application for environmental monitoring with a modern, accessible UI.

## Features

- **Sign Up Page**: User registration with username, email, and password fields
- **Login Page**: User authentication interface
- **Global CSS**: Comprehensive styling system with CSS variables, utilities, and components
- **Responsive Design**: Mobile-friendly layouts
- **Form Validation**: Client-side validation with error messages
- **Accessibility**: WCAG-compliant with proper focus states and ARIA support

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
Frontend/
├── src/
│   ├── pages/
│   │   ├── SignUp.jsx      # Sign up page component
│   │   ├── SignUp.css      # Sign up page styles
│   │   ├── Login.jsx       # Login page component
│   │   └── Login.css       # Login page styles
│   ├── App.jsx             # Main app component with routing
│   ├── main.jsx            # React entry point
│   └── global.css          # Global styles and utilities
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
└── package.json            # Dependencies and scripts
```

## Pages

### Sign Up Page (`/signup`)

- Username field (minimum 3 characters)
- Email field (with email validation)
- Password field (minimum 6 characters)
- Form validation with error messages
- Link to login page

### Login Page (`/login`)

- Email field
- Password field
- Form validation
- Link to sign up page

## Technologies Used

- **React 18**: UI library
- **React Router DOM**: Client-side routing
- **Vite**: Build tool and dev server
- **CSS3**: Styling with CSS variables and modern features

## Styling

The app uses a comprehensive global CSS file (`src/global.css`) that includes:

- CSS variables for colors, spacing, typography
- Utility classes for layout (flex, grid, spacing)
- Component styles (buttons, cards, forms)
- Accessibility features (focus states, reduced motion support)

## Development

The project uses Vite for fast development with Hot Module Replacement (HMR).

## License

This project is for educational purposes.

