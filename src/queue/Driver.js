'use strict';

const kue = require('kue-scheduler');

/**
 * Main queue driver
 *
 * @version 1.0.0
 * @adonis-version 3.2
 */
class Queue {
	
	/**
	 * Construct the queue
	 * @param  {Adonis/App} app Adonis app/Ioc instance
	 */
	constructor(app) {
		// inject the app instance
		this._app = app;
		// initialize adonis logic
		this._config = this._app.use('Adonis/Src/Config');
		// initialize kue queue
		this._queue = kue.createQueue(this._config.get('queue.connection'));
		// boost number of event listeners a queue instance can listen to
		this._queue.setMaxListeners(0);
	}	

	/**
	 * Register job event handlers
	 * @return {Promise}
	 */
	listen() {
		const JobRegister = require('./JobRegister');
		const register = new JobRegister(this._app);
		return register.setQueue(queue).listenForAppJobs();
	}


	/**
	 * Dispatch a new job
	 * @param  {App/Jobs} job Job instances
	 * @return {KueJob}
	 */
	dispatch(job, when = "now") {

		// create a job maker factory
		let JobMaker = require('./JobMaker');
		let maker = new JobMaker;

		// get the kue job converted from app job
		const kueJob = maker.setAppJob(job)
						    .setQueue(this.queue)
						    .process()
						    .getFinalJob();

		// schedule the job in the queue
		if (when == "now") {
			// immediate job
			this.queue.now(kueJob);
		} else if (when.includes("every") || when.includes("*")) {
			when = when.replace('every ', '');
			// cron or repeating job
			this.queue.every(when, kueJob);
		} else {
			// schedule a job
			this.queue.schedule(when, kueJob);
		}

		return job;

	}

	/**
	 * Remove a job from queue
	 * @param  {Mixed} job job_id/instance/criteria
	 * @return {Promise<Response>}
	 */
	remove(job) {

		return new Promise((resolve, reject) => {

			this.queue.remove(job, (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(response);
				}
			});

		});

	}

	/**
	 * Clear all jobs within a queue for a clean start
	 * @return {Promise}
	 */
	clear() {

		return new Promise((resolve, reject) => {

			this.queue.clear((error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(response);
				}
			});

		});

	}
}	


module.exports = Queue;