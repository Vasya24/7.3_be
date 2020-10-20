const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaStatic = require('koa-static');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const app = new Koa();

const public = path.join(__dirname, '/public')

app.use(koaStatic(public));

app.use(koaBody({
    urlencoded: true,
    multipart: true,
}));

app.use(async (ctx, next) => {
    const origin = ctx.request.get('Origin');
    if (!origin) {
      return await next();
    }

    const headers = { 'Access-Control-Allow-Origin': '*', };

    if (ctx.request.method !== 'OPTIONS') {
      ctx.response.set({...headers});
      try {
        return await next();
      } catch (e) {
        e.headers = {...e.headers, ...headers};
        throw e;
      }
    }

    if (ctx.request.get('Access-Control-Request-Method')) {
      ctx.response.set({
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
      });

      if (ctx.request.get('Access-Control-Request-Headers')) {
        ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
      }

      ctx.response.status = 204;
    }
  });

  let images;

  app.use(async (ctx) => {
    if (ctx.request.method === 'GET') {
      images = fs.readdirSync(public);
      ctx.response.body = JSON.stringify(images);
    }

    if (ctx.request.method === 'POST') {
      const { file } = ctx.request.files;
      const link = await new Promise((resolve) => {
      const id = uuid.v4();
      const newPath = path.join(public, id);
      console.log(newPath);
      const readStream = fs.createReadStream(file.path);
      const writeStream = fs.createWriteStream(newPath);
      readStream.on('close', () => {
          fs.unlink(file.path, (err) => {
            if (err) console.log(err);
          });
          resolve(id);
      });
      readStream.pipe(writeStream);
      images = fs.readdir(public, (err) => {
        if (err) console.log(err);
      });
    });
    ctx.response.body = link;
    }

    if (ctx.request.method === 'DELETE') {
      const link = ctx.request.querystring;
      fs.unlink(`./public/${link}`, (err) => {
        if (err) console.log(err);
      });
      images = fs.readdir(public, (err) => {
        if (err) console.log(err);
      });
      ctx.response.status = 200;
    }
  });

  const port = process.env.PORT || 4242;
  http.createServer(app.callback()).listen(port);