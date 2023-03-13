import React from 'react';
import { Helmet } from 'react-helmet';

const HtmlHead = () => {
  return (
    <Helmet>
      <meta charSet='utf-8' />
      <meta httpEquiv='x-ua-compatible' content='ie=edge' />
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1, shrink-to-fit=no'
      />
      <meta name='note' content='environment=development' />
      <title>About Usman Kamran</title>
      <script src='https://use.fontawesome.com/d41a1a9d72.js'></script>
      <script
        src='https://code.jquery.com/jquery-3.2.1.slim.min.js'
        integrity='sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN'
        crossOrigin='anonymous'
      ></script>
      <meta property='og:site_name' content="Sameers's Resume" />
      <meta property='og:title' content='About Sameer Kamran' />
      <meta
        property='og:description'
        content='This web page is a Resume and contains all the experiences, education and achievements of Sameer Kamran.'
      />
      <meta
        property='og:image'
        content='https://avatars.githubusercontent.com/u/24979298?v=4'
      />
      <meta property='og:url' content='https://smrkamran.github.io/' />
      <meta property='og:type' content='profile' />
      <meta property='profile:first_name' content='Sameer' />
      <meta property='profile:last_name' content='Kamran' />
      <meta property='profile:gender' content='male' />
      <meta property='profile:username' content='smrkamran' />
      <meta property='og:image:width' content='255' />
      <meta property='og:image:height' content='255' />
      <link
        rel='icon'
        type='image/x-icon'
        href='/favicon.ico'
      />
    </Helmet>
  );
};

export default HtmlHead;
