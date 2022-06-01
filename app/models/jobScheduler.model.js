module.exports = (mongoose) => {
  const schema = mongoose.Schema(
    {
      user_id: {
        type: String,
        required: false,
      },
      medName: {
        type: String,
        required: false,
      },
      startDate: {
        type: Date,
        required: false,
      },
      schedule: [
        {
          time: {
            type: Date,
            required: false,
          },
          takePill: {
            type: Number,
            required: false,
          },
        },
      ],
    },
    { timestamps: true }
  );

  //   schema.method("toJSON", function () {
  //     const { __v, _id, ...object } = this.object();
  //     object.id = _id;
  //     return object;
  //   });

  const jobScheduler = mongoose.model("jobSchedulers", schema);
  return jobScheduler;
};
