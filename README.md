# JSON Email Generator

A modern React-based application for generating JSON data with multiple email addresses using customizable username patterns. Perfect for testing, development, and bulk email account creation.

## 🚀 Features

- **Dynamic Email Generation**: Create multiple email addresses with customizable patterns
- **Template System**: Use placeholders like `{first}`, `{last}`, `{f}`, `{l}` for dynamic substitution
- **Random Pattern Generator**: Automatically generate common email patterns
- **JSON Export**: Copy to clipboard or download as JSON file
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Vercel Ready**: Optimized for seamless Vercel deployment

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **JavaScript ES6+** - Modern JavaScript features

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/clydeskieme1/JSON-Generator.git
cd JSON-Generator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🌐 Deploy to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. Push your code to a GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect it's a Vite project and configure the build settings
6. Click "Deploy"

### Option 2: Deploy using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to configure your deployment

## 🎯 Usage

1. **Enter Personal Information**: Fill in first name, last name, and password
2. **Configure Email Settings**: Set the email domain and maximum results
3. **Define Username Patterns**: 
   - Enter patterns manually (one per line)
   - Use placeholders: `{first}`, `{last}`, `{f}`, `{l}`
   - Or click "Generate Random Patterns" for common patterns
4. **Generate**: Click the Generate button to create your JSON
5. **Export**: Copy to clipboard or download as JSON file

### Pattern Examples

```
{first}.{last}          → john.smith@company.com
{first}{last}           → johnsmith@company.com
{f}{last}               → jsmith@company.com
{first}_{last}          → john_smith@company.com
admin                   → admin@company.com
{first}123              → john123@company.com
```

## 📋 Output Format

The generated JSON includes:
- Personal information (first name, last name, password)
- Primary username
- Email domain
- Array of generated email addresses with full details

```json
{
  "first_name": "John",
  "last_name": "Smith",
  "password": "MySecurePass123",
  "username": "john.smith@company.com",
  "domain": "company.com",
  "sharedmailbox": [
    {
      "first_name": "John",
      "last_name": "Smith",
      "password": "MySecurePass123",
      "username": "john.smith@company.com",
      "domain": "company.com"
    }
    // ... more entries
  ]
}
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── EmailJsonGeneratorUI.jsx  # Main component
├── main.jsx                  # App entry point
└── index.css                 # Global styles
```

## 🚀 Performance Features

- **Vite**: Lightning-fast HMR and build times
- **Code Splitting**: Automatic code splitting for optimal loading
- **Modern JavaScript**: ES6+ features for better performance
- **Optimized Build**: Production builds are minified and optimized

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙋‍♂️ Support

If you have any questions or need help with deployment, please open an issue on GitHub.

---

Made with ❤️ for developers who need bulk email generation tools.