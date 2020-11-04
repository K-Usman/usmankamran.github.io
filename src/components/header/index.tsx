import React from "react"
import "./style.scss"

interface HeaderContent {
    text: {
        title: string
    }
}

interface ResumeFile {
    resume: {
        url: string,
        title: string
    }
}

const Header = (props: HeaderContent & ResumeFile) => {
    return (
        <>
            <nav id="navbar" className="navbar navbar-light bg-light navbar-fixed-top mh-nav">
                <a className="navbar-brand" href="#"><b>{props.text.title}</b></a>
                <a
                    className="download-phone"
                    href={props.resume.url}
                    data-toggle="tooltip"
                    title={props.resume.title}
                    download
                >Download PDF version</a
                >
                <ul className="nav nav-pills">
                    <li className="nav-item" id="intro-link">
                        <a className="nav-link" href="#intro">Intro</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link" href="#education">Education</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link" href="#exp">Experience</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link" href="#contact">Contact</a>
                    </li>
                    <li className="nav-item download-button">
                        <a
                            className="nav-link download-button-text"
                            href={props.resume.url}
                            data-toggle="tooltip"
                            title={props.resume.title}
                            download
                        >Download</a
                        >
                    </li>
                </ul>
            </nav>
        </>
    )
}

export default Header;