import 'reflect-metadata'
import 'dotenv/config'
import { buildSchema } from "type-graphql";
import { ApolloServer } from "apollo-server-express";
import { 
    ApolloServerPluginLandingPageGraphQLPlayground
 } from 'apollo-server-core';
import express, { json } from "express";
import cors from 'cors';
import helmet from 'helmet';
import enforce from 'express-sslify';
import Error from './middlewares/errorHandler';
import { resolvers } from "./resolvers";


const { NODE_ENV,ALLOWED_ORIGINS,PORT } = process.env;

(async () => {
    try {
        const app= express()

        const contextService= require('request-context')
        app.use(contextService.middleware('req'))

        const schema =await  buildSchema({
            resolvers,
        }) 
        // Create production basic security
		if (NODE_ENV === 'production') {
		    app.use(json({ limit: '2mb' }));
			app.use(enforce.HTTPS({ trustProtoHeader: true }));
			app.use(helmet());
			app.disable('x-powered-by');
			app.use(
				cors({
					origin: (origin, callback) => {
						if (origin === undefined) {
							return callback(null, true);
						}
						if (JSON.parse(ALLOWED_ORIGINS!).some((u: string) => origin!.includes(u))) {
							return callback(null, true);
						}
						throw new Error('The origin is not allowed', 500);
					},
				}),
			);
		}else {
            app.use(cors());
        }

        const server = new ApolloServer({
			schema,
			debug: false,
            plugins:[ApolloServerPluginLandingPageGraphQLPlayground({})],
            context: ({req, res})=> {return {req,res}; },
            introspection:true
		});

		// Start Apollo server
        await server.start();

        // Create middleware
		server.applyMiddleware({ app });

		// listen to port
		app.listen(PORT, () =>
			console.log(`🚀 Server running on http://localhost:${PORT}/graphql`),
		);

    } catch ({code, message}) {
        throw new Error(message, code);
    }
})();