import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import { Route, Switch } from 'wouter';

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster theme="dark"/><Switch><Route path="/products/:slug" component={ProductDetail}/><Route path="/" component={Home}/></Switch></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
