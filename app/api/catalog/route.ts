import { makeChorusProxy } from "../shared/chorusProxy";

const proxy = makeChorusProxy("catalog");

export const GET = proxy.GET;
export const POST = proxy.POST;
export const PATCH = proxy.PATCH;
export const DELETE = proxy.DELETE;
