import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AssetsScripts from "./components/assets-scripts";
import logoImg from "@/public/assets/images/logo-1.png";

export const metadata: Metadata = {
  title: "LFC-JAHI MEDIA | Audio Messages",
  description: "LFC-JAHI MEDIA audio message library",
};

export default function Home() {
  return (
    <>
      <div id="gen-loading">
        <div id="gen-loading-center">
          <Image src={logoImg} alt="loading" width={80} height={80} priority />
        </div>
      </div>

      <header id="gen-header" className="gen-header-style-1 gen-has-sticky">
        <div className="gen-bottom-header">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <nav className="navbar navbar-expand-lg navbar-light">
                  <Link className="navbar-brand" href="/">
                    <Image
                      className="img-fluid logo"
                      src={logoImg}
                      alt="LFC-JAHI MEDIA logo"
                      width={150}
                      height={40}
                      priority
                    />
                  </Link>
                  <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <div id="gen-menu-contain" className="gen-menu-contain">
                      <ul id="gen-main-menu" className="navbar-nav ml-auto">
                        <li className="menu-item active">
                          <Link href="/">Home</Link>
                        </li>
                        <li className="menu-item">
                          <a href="#message-library">Messages</a>
                        </li>
                        <li className="menu-item">
                          <a href="#about-ministry">About</a>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="gen-header-info-box">
                    <div className="gen-btn-container">
                      <Link href="/single-message?id=renewed-strength" className="gen-button">
                        <div className="gen-button-block">
                          <span className="gen-button-line-left"></span>
                          <span className="gen-button-text">Latest Message</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                  <button
                    className="navbar-toggler"
                    type="button"
                    data-toggle="collapse"
                    data-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                  >
                    <i className="fas fa-bars"></i>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="lfc-hero">
        <div className="container">
          <div className="row">
            <div className="col-lg-10">
              <div className="gen-tag-line">
                <span>LFC-JAHI MEDIA</span>
              </div>
              <div className="gen-movie-info">
                <h1 className="text-white">Listen, Grow, And Download Powerful Audio Messages</h1>
              </div>
              <p className="text-white mt-3 d-none d-md-block">
                Explore sermon messages by title, pastor, date, year, and month. Click any message card to open a
                full page with description, streaming audio, and direct download.
              </p>
              <div className="gen-movie-action mt-4">
                <div className="gen-btn-container mr-3 d-inline-block">
                  <a href="#message-library" className="gen-button">
                    <i className="fa fa-play"></i>
                    <span className="text">Browse Library</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="message-library" className="lfc-filter-panel">
        <div className="container">
          <div className="lfc-filter-card">
            <div className="row align-items-end">
              <div className="col-lg-4 col-md-6 mb-3">
                <label className="text-white mb-2" htmlFor="searchInput">
                  Search Messages
                </label>
                <input
                  id="searchInput"
                  type="text"
                  className="form-control"
                  placeholder="Search by title, pastor, scripture, or series"
                />
              </div>
              <div className="col-lg-2 col-md-6 mb-3">
                <label className="text-white mb-2" htmlFor="yearFilter">
                  Year
                </label>
                <select id="yearFilter" className="custom-select">
                  <option value="">All Years</option>
                </select>
              </div>
              <div className="col-lg-2 col-md-6 mb-3">
                <label className="text-white mb-2" htmlFor="monthFilter">
                  Month
                </label>
                <select id="monthFilter" className="custom-select">
                  <option value="">All Months</option>
                </select>
              </div>
              <div className="col-lg-2 col-md-6 mb-3">
                <label className="text-white mb-2" htmlFor="pastorFilter">
                  Pastor
                </label>
                <select id="pastorFilter" className="custom-select">
                  <option value="">All Pastors</option>
                </select>
              </div>
              <div className="col-lg-2 col-md-6 mb-3">
                <label className="text-white mb-2" htmlFor="sortFilter">
                  Sort
                </label>
                <select id="sortFilter" className="custom-select">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="duration-asc">Duration: Shortest</option>
                  <option value="duration-desc">Duration: Longest</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>
              <div className="col-lg-12">
                <button id="clearFilters" className="gen-button gen-button-flat">
                  <span className="text">Clear Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gen-section-padding-2">
        <div className="container">
          <div className="row align-items-center mb-4">
            <div className="col-md-7">
              <h4 className="gen-heading-title mb-2">Audio Message Library</h4>
              <p id="resultCount" className="lfc-count mb-0">
                Showing 0 of 0 messages
              </p>
            </div>
            <div className="col-md-5 text-md-right mt-3 mt-md-0">
              <Link href="/single-message?id=renewed-strength" className="gen-button gen-button-flat">
                <span className="text">Quick Play Latest Message</span>
              </Link>
            </div>
          </div>

          <div id="noResults" className="lfc-empty lfc-hidden mb-4">
            <h5 className="text-white mb-2">No message found</h5>
            <p className="mb-0">Try removing one or more filters, or search with a different keyword.</p>
          </div>

          <div id="messageGrid" className="row"></div>
        </div>
      </section>

      <section id="about-ministry" className="gen-section-padding-3 pt-0">
        <div className="container">
          <div className="lfc-single-card">
            <div className="row align-items-center">
              <div className="col-lg-8">
                <h4 className="text-white mb-2">About LFC-JAHI MEDIA</h4>
                <p className="mb-0">
                  LFC-JAHI MEDIA exists to archive and distribute faith-building messages in audio format so members
                  and partners can listen anytime and stay connected to God&apos;s Word.
                </p>
              </div>
              <div className="col-lg-4 text-lg-right mt-3 mt-lg-0">
                <Link href="/single-message?id=renewed-strength" className="gen-button">
                  <span className="text">Start Listening</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="gen-footer">
        <div className="gen-footer-style-1">
          <div className="gen-footer-top">
            <div className="container">
              <div className="row">
                <div className="col-xl-4 col-md-6">
                  <div className="widget">
                    <Image
                      src={logoImg}
                      className="gen-footer-logo"
                      alt="LFC-JAHI MEDIA logo"
                      width={150}
                      height={40}
                    />
                    <p>Audio sermons for spiritual growth, anytime and anywhere.</p>
                  </div>
                </div>
                <div className="col-xl-4 col-md-6">
                  <div className="widget">
                    <h4 className="footer-title">Quick Links</h4>
                    <ul className="menu">
                      <li className="menu-item">
                        <Link href="/">Home</Link>
                      </li>
                      <li className="menu-item">
                        <a href="#message-library">Message Library</a>
                      </li>
                      <li className="menu-item">
                        <Link href="/single-message?id=renewed-strength">Latest Message</Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="col-xl-4 col-md-6">
                  <div className="widget">
                    <h4 className="footer-title">Need Prayer?</h4>
                    <p>Reach the media team for message requests and prayer support.</p>
                    <a
                      href="https://wa.link/m73q6m"
                      className="gen-button gen-button-flat"
                      target="_blank"
                      rel="noopener"
                    >
                      <span className="text">Contact on WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="gen-copyright-footer">
            <div className="container">
              <div className="row">
                <div className="col-md-12 align-self-center">
                  <span className="gen-copyright">Copyright 2026 LFC-JAHI MEDIA. All rights reserved.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <div id="back-to-top">
        <a className="top" id="top" href="#top">
          <i className="ion-ios-arrow-up"></i>
        </a>
      </div>

      <AssetsScripts pageScript="lfc-library.js" />
    </>
  );
}
