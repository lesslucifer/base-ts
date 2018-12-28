import { JobServ, JobManager } from "./job";

export function initJobs() {
    JobManager.start();
}