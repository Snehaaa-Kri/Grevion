import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const SLOW_QUERY_THRESHOLD_MS = 100; // flag any DB query slower than this

// Mongoose query performance hooks.
// Every find/update/delete/aggregate call gets timed.
// Slow ones are printed with [SLOW-DB] so you can spot DB bottlenecks instantly.
mongoose.plugin((schema) => {
    // List of query hooks to monitor
    const queryHooks = [
        "find", "findOne", "findOneAndUpdate", "findOneAndDelete",
        "updateOne", "updateMany", "deleteOne", "deleteMany", "countDocuments",
    ];

    queryHooks.forEach((hook) => {
        schema.pre(hook, function () {
            this._perfStart = Date.now();
        });

        schema.post(hook, function () {
            if (!this._perfStart) return;
            const duration = Date.now() - this._perfStart;
            const collection = this.model?.collection?.name || "unknown";
            const filter = JSON.stringify(this.getFilter?.() || {});

            if (duration > SLOW_QUERY_THRESHOLD_MS) {
                console.warn(
                    `[SLOW-DB] ${hook} on "${collection}"  →  ${duration}ms  filter: ${filter}`
                );
            } else {
                console.log(
                    `[DB]      ${hook} on "${collection}"  →  ${duration}ms`
                );
            }
        });
    });

    // Aggregate queries
    schema.pre("aggregate", function () {
        this._perfStart = Date.now();
    });
    schema.post("aggregate", function () {
        if (!this._perfStart) return;
        const duration = Date.now() - this._perfStart;
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            console.warn(`[SLOW-DB] aggregate  →  ${duration}ms`);
        } else {
            console.log(`[DB]      aggregate  →  ${duration}ms`);
        }
    });
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL,{
    });
    console.log("MongoDB Connected Successfully!");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1); 
  }
};

export default connectDB;
