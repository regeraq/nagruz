# Design Guidelines: НМ-100 Industrial Load Testing Equipment Website

## Design Approach

**Selected Framework:** Enterprise Design System with Industrial Aesthetics
- Drawing from Material Design for structure and Carbon Design for technical data presentation
- Targeting B2B industrial clients requiring precision, credibility, and detailed technical information
- Premium technological aesthetic balancing professionalism with modern web standards

## Core Design Principles

1. **Technical Precision**: Every element communicates reliability and engineering excellence
2. **Information Hierarchy**: Complex technical data presented with absolute clarity
3. **Professional Credibility**: Visual language builds trust with industrial decision-makers
4. **Efficient Navigation**: Multi-page structure with intuitive wayfinding for technical stakeholders

---

## Typography System

**Primary Font:** Inter or IBM Plex Sans (via Google Fonts CDN)
- Excellent technical readability, professional appearance, supports Cyrillic

**Type Scale:**
- Hero Headline: text-5xl md:text-6xl lg:text-7xl, font-bold
- Section Headers (H2): text-3xl md:text-4xl lg:text-5xl, font-bold
- Subsection Headers (H3): text-2xl md:text-3xl, font-semibold
- Technical Labels: text-sm md:text-base, font-medium, uppercase tracking-wide
- Body Text: text-base md:text-lg, font-normal, leading-relaxed
- Technical Specifications: text-sm md:text-base, font-mono (for precise values)
- Small Print/Captions: text-xs md:text-sm

---

## Layout System

**Spacing Primitives:** Tailwind units of 4, 8, 12, 16, 20, 24
- Consistent rhythm: py-16 md:py-24 lg:py-32 for major sections
- Card padding: p-8 md:p-12
- Component gaps: gap-8 md:gap-12
- Tight groupings: gap-4

**Container Strategy:**
- Full-width sections: w-full with inner max-w-7xl mx-auto px-6 md:px-8
- Content sections: max-w-6xl mx-auto
- Technical tables: max-w-5xl mx-auto
- Text content: max-w-4xl (for readability)

**Grid Systems:**
- Technical specs: 2-column md:3-column lg:4-column grids
- Feature benefits: 1-column md:2-column lg:3-column cards
- Application areas: 2-column md:3-column icon grid
- Equipment photos: 2-column md:4-column gallery

---

## Page Structure & Components

### 1. Hero Section (100vh)
- Large hero background image: Industrial facility or 3D render of НМ-100 device in operation
- Centered content overlay with semi-transparent backdrop (backdrop-blur-xl)
- Hero headline emphasizing professional positioning
- Technical subtitle with key specs (100 kW, 20-step load, AC/DC capability)
- Two CTAs: Primary "Получить спецификацию" + Secondary "Технические характеристики"
- Scroll indicator at bottom

### 2. Purpose & Principle Section
- Two-column layout (md:grid-cols-2)
- Left: Isometric diagram or cutaway 3D render of device
- Right: Structured text explaining controlled load simulation
- Bullet list of testable parameters (power, current, voltage, harmonics) with icon indicators
- Background: Subtle technical pattern or grid

### 3. Key Benefits Section
- Card grid layout (md:grid-cols-2 lg:grid-cols-3)
- Each benefit card: Icon (Heroicons), bold title, 2-3 line description
- Benefits: 20-step load control, AC/DC compatibility, device coupling, power factor, continuous operation, protection systems, cooling, temperature range
- Cards with subtle borders, elevated on hover (hover:shadow-lg transition)

### 4. Technical Specifications Section
- Tabbed interface or accordion for AC Block / DC Block / General Parameters
- Specifications table with clear label-value pairs
- Use monospace font for numerical values
- Organized subsections: Operating modes, protection, cooling, environmental
- Highlight critical specs (100 kW ±10%, cos φ ≥0.99) with visual distinction

### 5. Delivery Package Section
- Checklist-style layout with checkmark icons
- Four groups: AC blocks, DC blocks, cables, documentation
- Each item with icon, name, and brief spec
- Documentation items with downloadable PDF indicators
- Visual hierarchy separating equipment from paperwork

### 6. Compliance & Certification Section
- Badge/certificate display in grid (md:grid-cols-3 lg:grid-cols-4)
- Icons representing: GOST compliance, RF safety standards, Federal Information Fund, calibration certificates
- "2025 New Equipment" prominently featured
- Download links for documentation
- Trust indicators with official seals

### 7. Application Areas Section
- Icon-headline grid (md:grid-cols-2 lg:grid-cols-3)
- Large illustrative icons for: Diesel generators, gas piston units, gas turbines, UPS systems, batteries, power quality testing
- Brief description under each application
- Subtle connecting lines or background pattern

### 8. About Company Section
- Single-column centered content
- Focus on industrial clients, nuclear energy sector experience
- 2-column stats (projects completed, industries served)
- Brief company credibility statement

### 9. Contact Form Section
- Two-column layout: Form (left 60%) + Contact info/map placeholder (right 40%)
- Form fields: Full name, phone, email, company, message (textarea)
- File upload area with drag-drop indicator
- Primary CTA: "Получить коммерческое предложение"
- Contact info: Phone, email, address with icons
- Response time indicator

### 10. Footer
- Three-column layout: Company info, Quick links, Technical resources
- Newsletter signup optional
- Social links if applicable
- Copyright, privacy policy, terms
- Repeat CTAs if appropriate

---

## Component Library

**Navigation:**
- Fixed header with logo, main menu, CTA button
- Desktop: Horizontal menu with dropdown for technical sections
- Mobile: Hamburger menu with full-screen overlay
- Sticky behavior on scroll with reduced height

**Buttons:**
- Primary: Solid, medium-large (px-8 py-4), rounded-lg, font-semibold
- Secondary: Outlined, same sizing
- Icon buttons: Consistent 44×44px minimum touch target

**Cards:**
- Benefit cards: Bordered, rounded-xl, p-8, with icon-title-description structure
- Spec cards: Clean, data-focused, minimal decoration
- Hover states: Subtle lift (translate-y-1) and shadow increase

**Tables:**
- Technical specs: Zebra striping for rows, clear headers, aligned columns
- Responsive: Stack to definition list on mobile
- Bordered cells for clarity

**Form Elements:**
- Inputs: Large touch targets (h-12 md:h-14), rounded borders, clear focus states
- Labels: Above inputs, font-medium, text-sm
- File upload: Dashed border drop zone with icon and instruction text

**Icons:**
- Use Heroicons (outline style) via CDN for consistency
- 24×24px standard, 32×32px for feature highlights, 48×48px for application areas
- Technical icons from icon library where appropriate

---

## Images & Visual Assets

**Images:**
1. **Hero Image:** High-quality photo or photorealistic 3D render of НМ-100 device in industrial setting, dramatic lighting, showing scale and professional environment
2. **Product Images:** Multiple angles of device blocks, detail shots of control panels, cable connections
3. **Isometric Diagrams:** Technical cutaway showing AC/DC blocks, cooling system, internal structure
4. **Application Context:** Photos of device testing generators, UPS systems in real industrial environments
5. **Certification Badges:** Official logos for GOST, RF standards, calibration seals

**Image Placement:**
- Hero: Full-width background with overlay
- Product showcase: 4-column gallery in specs section
- Technical diagrams: Integrated with text explanations
- Application areas: Supporting icons (not photos unless available)

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px (single column, stacked content)
- Tablet: 768px - 1024px (2-column grids, reduced spacing)
- Desktop: > 1024px (full multi-column layouts)

**Mobile Optimizations:**
- Navigation: Full-screen menu overlay
- Tables: Transform to stacked key-value lists
- Hero: Reduce text size, maintain impact
- Forms: Full-width inputs with ample spacing
- Spec tables: Accordion format for better scanning

---

## Accessibility & Performance

- Semantic HTML5 structure (header, nav, main, section, article, footer)
- ARIA labels for interactive elements
- Keyboard navigation support
- Form validation with clear error states
- Image lazy loading for performance
- Optimized web fonts with fallbacks
- Target 85+ Google PageSpeed score

---

## Animation Guidelines

**Minimal, purposeful animations:**
- Page load: Subtle fade-in for hero content (duration-700)
- Scroll: Intersection observer for section fade-ins (only on desktop)
- Hover: Cards lift slightly, buttons darken
- No parallax, no complex scroll-triggered sequences
- Form: Smooth validation feedback

---

## Multi-Page SEO Structure

**Pages:**
1. Home (main landing with all sections)
2. Technical Specifications (detailed breakdown)
3. Documentation (downloadable resources)
4. Applications (expanded use cases)
5. Contact

**SEO Elements:**
- H1: Single per page, product name + key benefit
- H2: Section headers with keyword-rich content
- H3: Subsections and specifications
- Meta descriptions: 150-160 characters, technical focus
- Structured data: Product schema with specifications