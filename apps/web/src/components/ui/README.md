# UI Components

## Library: Shadcn/ui

This project uses [Shadcn/ui](https://ui.shadcn.com/) as the primary UI component library.

### Configuration

- **Style**: New York
- **Base Color**: Zinc
- **CSS Variables**: Enabled
- **Icon Library**: Lucide React

### Adding New Components

```bash
# Add a new shadcn component
npx shadcn@latest add [component-name]

# Example
npx shadcn@latest add button
npx shadcn@latest add dialog
```

### Component Structure

```
src/components/
├── ui/                 # Shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/             # Layout components (Header, Sidebar, etc.)
├── dashboard/          # Dashboard-specific components
├── loans/              # Loan feature components
├── charts/             # Chart components (using Recharts)
└── ...
```

### Customization

Components can be customized by editing their source files directly. All components are copied to the project, not installed as a dependency.

### Theme

The theme is configured in:
- `tailwind.config.ts` - Tailwind configuration
- `src/app/globals.css` - CSS variables for colors

Dark mode is supported via `next-themes` provider.
