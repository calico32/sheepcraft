import React from 'react'
import styles from '../styles/util.module.scss'

interface HeroProps {
  appBar?: boolean
  actionBar?: boolean
}

const Hero: React.FC<HeroProps> = ({ appBar = false, actionBar = false, children }) => {
  return (
    <section
      className={`flex flex-col items-center justify-center w-full ${styles.hero} -mt-4 ${
        appBar ? styles['has-app-bar'] : ''
      } ${actionBar ? styles['has-action-bar'] : ''}`}
    >
      {children}
    </section>
  )
}

export default Hero
