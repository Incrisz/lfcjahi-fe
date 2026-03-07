import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AssetsScripts from "../components/assets-scripts";
import logoImg from "@/public/assets/images/logo-1.png";
import heroImg from "@/public/assets/images/background/asset-14.jpeg";

export const metadata: Metadata = {
  title: "Message Detail | LFC-JAHI MEDIA",
  description: "LFC-JAHI MEDIA single audio message page",
};

export default function SingleMessagePage() {
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
                        <li className="menu-item">
                          <Link href="/">Home</Link>
                        </li>
                        <li className="menu-item active">
                          <Link href="/single-message">Message Detail</Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="gen-header-info-box">
                    <div className="gen-btn-container">
                      <Link href="/#message-library" className="gen-button">
                        <div className="gen-button-block">
                          <span className="gen-button-line-left"></span>
                          <span className="gen-button-text">Back to Library</span>
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

      <section className="lfc-single-hero">
        <div className="container">
          <div className="row">
            <div className="col-lg-9">
              <div className="gen-tag-line">
                <span>MESSAGE DETAILS</span>
              </div>
              <h1 id="messageTitle" className="text-white">
                Message Title
              </h1>
              <div className="gen-movie-meta-holder">
                <ul className="gen-meta-after-title">
                  <li>
                    <i className="far fa-calendar-alt"></i> <span id="messageDate">Date</span>
                  </li>
                  <li>
                    <i className="far fa-clock"></i> <span id="messageDuration">Duration</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gen-section-padding-2 lfc-single-wrap">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mb-4">
              <div className="lfc-single-card">
                <Image
                  id="messageImage"
                  className="lfc-single-image"
                  src={heroImg}
                  alt="Message image"
                  width={800}
                  height={450}
                  priority
                />
                <audio id="audioPlayer" className="lfc-audio" controls preload="none">
                  Your browser does not support the audio element.
                </audio>
                <div className="gen-movie-action mb-4">
                  <div className="gen-btn-container mr-3 d-inline-block">
                    <a id="downloadMessage" href="#" className="gen-button" download>
                      <i className="fa fa-download"></i>
                      <span className="text">Download Message</span>
                    </a>
                  </div>
                  <div className="gen-btn-container d-inline-block">
                    <button id="copyMessageLink" className="gen-button gen-button-flat" type="button">
                      <span className="text">Copy Message Link</span>
                    </button>
                  </div>
                </div>
                <h4 className="text-white">Description</h4>
                <p id="messageDescription" className="lfc-description mb-0">
                  Message description
                </p>
              </div>
            </div>

            <div className="col-lg-4 mb-4">
              <div className="lfc-single-card">
                <span className="lfc-pastor-chip" id="messagePastorChip">
                  Pastor Name
                </span>
                <h5 className="text-white mb-3">Message Information</h5>
                <ul className="lfc-meta-list">
                  <li>
                    <strong>Pastor:</strong>
                    <span id="metaPastor">Pastor Name</span>
                  </li>
                  <li>
                    <strong>Date:</strong>
                    <span id="metaDate">Date</span>
                  </li>
                  <li>
                    <strong>Duration:</strong>
                    <span id="metaDuration">Duration</span>
                  </li>
                  <li>
                    <strong>Series:</strong>
                    <span id="messageSeries">Series Name</span>
                  </li>
                  <li>
                    <strong>Key Scripture:</strong>
                    <span id="messageScripture">Scripture</span>
                  </li>
                </ul>
                <div className="gen-btn-container mt-4">
                  <a id="browseByPastor" href="#" className="gen-button gen-button-flat">
                    <span className="text">More From This Pastor</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gen-section-padding-3 pt-0">
        <div className="container">
          <div className="row mb-3">
            <div className="col-lg-12">
              <h4 className="gen-heading-title">More Messages</h4>
            </div>
          </div>
          <div id="relatedMessages" className="row"></div>
        </div>
      </section>

      <footer id="gen-footer">
        <div className="gen-footer-style-1">
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

      <AssetsScripts pageScript="lfc-single-message.js" />
    </>
  );
}
