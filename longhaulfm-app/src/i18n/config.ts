import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '../../locales/en.json'
import af from '../../locales/af.json'
import zu from '../../locales/zu.json'
import sn from '../../locales/sn.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'zu', label: 'isiZulu' },
  { code: 'sn', label: 'ChiShona' },
] as const

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      af: { translation: af },
      zu: { translation: zu },
      sn: { translation: sn },
    },
    fallbackLng: 'en',
    lng: 'en', // default — presenter can switch in settings
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // In Tauri we don't want URL or cookie detection — use localStorage only
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n