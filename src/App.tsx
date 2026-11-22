import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Header from './components/Header'
import Footer from './components/Footer'
import PageTransition from './components/motion/PageTransition'
import { pageview } from './lib/analytics'
import { LocaleFrame, LocaleProvider, splitLocale, useAutoLocale } from './i18n'
import Home from './pages/Home'
import AllTools from './pages/AllTools'
import ArHome from './pages/ArHome'
import ArHelp from './pages/ArHelp'
import ArPrivacy from './pages/ArPrivacy'
import ArBlog from './pages/ArBlog'
import ArAbout from './pages/ArAbout'
import ArTerms from './pages/ArTerms'
import ToolPage from './pages/ToolPage'

import About from './pages/About'
import Help from './pages/Help'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import NotFound from './pages/NotFound'

export default function App() {
  const location = useLocation()
  useAutoLocale()
  const { locale } = splitLocale(location.pathname)

  // SPA navigations do not fire a page load, so each route change is one view.
  useEffect(() => {
    pageview(location.pathname)
  }, [location.pathname])

  return (
    <LocaleProvider locale={locale}>
      <LocaleFrame locale={locale} />
      <MotionConfig reducedMotion="user" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            {/* keyed transition container: old page leaves, new page rises in */}
            <PageTransition>
              <Routes location={location}>
                {/* English */}
                <Route path="/" element={<Home />} />
                <Route path="/pdf-tools" element={<AllTools />} />
                <Route path="/about" element={<About />} />
                <Route path="/help" element={<Help />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                {/* Arabic — same components, Arabic copy and RTL */}
                <Route path="/ar" element={<ArHome />} />
                <Route path="/ar/pdf-tools" element={<AllTools />} />
                <Route path="/ar/help" element={<ArHelp />} />
                <Route path="/ar/privacy" element={<ArPrivacy />} />
                <Route path="/ar/about" element={<ArAbout />} />
                <Route path="/ar/terms" element={<ArTerms />} />
                <Route path="/ar/blog" element={<ArBlog />} />
                <Route path="/ar/blog/:slug" element={<BlogPost />} />

                {/* tools exist in both locales */}
                <Route path="/:slug" element={<ToolPage />} />
                <Route path="/ar/:slug" element={<ToolPage />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </main>
          <Footer />
        </div>
      </MotionConfig>
    </LocaleProvider>
  )
}
