using CSV
using DataFrames
using TextAnalysis
using JLD2
using Statistics
using StatsBase
using LinearAlgebra
using Distances
using Mongoc
#loading the model
# Define a global cache for the model
global MODEL_CACHE = nothing

function load_model_once()
    global MODEL_CACHE
    if MODEL_CACHE === nothing
        println("Loading model for the first time...")
        task_clusters = load("/home/Data/v0Files/v0_trainings_1/task_clusters.jld2")["task_clusters"]
        disc_clusters = load("/home/Data/v0Files/v0_trainings_1/disc_clusters.jld2")["disc_clusters"]
        part_price = load("/home/Data/v0Files/v0_trainings_1/part_price.jld2")["part_price"]
        coom = load("/home/Data/v0Files/v0_trainings_1/coom.jld2")["coom"]
        lexicon = load("/home/Data/v0Files/v0_trainings_1/lexicon.jld2")["lexicon"]
        idf = load("/home/Data/v0Files/v0_trainings_1/idf.jld2")["idf"]
        training_embeddings = load("/home/Data/v0Files/v0_trainings_1/training_embeddings.jld2")["training_embeddings"]
        
        MODEL_CACHE = (task_clusters, disc_clusters, part_price, coom, lexicon, idf, training_embeddings)
    else
        println("Model already loaded. Using cached version.")
    end
    return MODEL_CACHE
end



# Connect to MongoDB
client = Mongoc.Client("mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl")
db = Mongoc.Database(client, "gmr-mro")
input_collection = Mongoc.Collection(db, "estimate_file_upload")
#status_collection = Mongoc.Collection(db, "estimates_status")


function process_document(estIDs)
    if isempty(estIDs)
        println("No documents found with status 'Initiated'.")
    else
        # Fetch filtered data for the first estID (modify to loop if needed)
        query = Mongoc.BSON("estID" => estIDs[1])
        cursor = Mongoc.find(input_collection, query)

        # Convert cursor to an array
        docs = collect(cursor)

        if !isempty(docs)
            bson_data = first(docs)  # Safe to access the first document
            println("estID: ", bson_data["estID"],"is processing")

            # Update the status in status_collection
            update_query = Mongoc.BSON("estID" => bson_data["estID"], "status" => "Initiated")
            update_data = Mongoc.BSON("\$set" => Mongoc.BSON("status" => "Progress"))

            result = Mongoc.update_one(input_collection, update_query, update_data)
        else
            println("No matching document found in input_collection.")
        end

        folder_name = string(estIDs[1])
        filepath = "/home/Data/v0Files/v0_results/" * folder_name * "/"
        mkpath(filepath)
        tasks = bson_data["task"]
        descriptions = bson_data["description"]

        # Create a DataFrame
        df = DataFrame(task = [], description = [])

        # Populate the DataFrame
        for (task, description) in zip(tasks, descriptions)
            push!(df, (task, description))
        end

        # Function to compute Cosine Similarity safely
        function cosine_similarity(vec1, vec2)
            norm1 = norm(vec1)
            norm2 = norm(vec2)
            if norm1 == 0 || norm2 == 0
                return 0.0
            end
            return dot(vec1, vec2) / (norm1 * norm2)
        end

        # Function to handle text preprocessing
        function split_and_trim(s)
            return first(split(strip(something(s, "")), "\n"))
        end

        # Function to compute embeddings using TF-IDF
        function apply_embeddings(df::DataFrame, text_col::Symbol, trained::NamedTuple)
            lex = trained.lexicon
            idf_vector = trained.idf

            function compute_embedding(text)
                doc = StringDocument(text)
                count_vec = dtv(doc, lex)
                s = sum(count_vec)
                tf_vec = s == 0 ? count_vec : count_vec ./ s
                return tf_vec .* idf_vector
            end

            return [compute_embedding(split_and_trim(text)) for text in df[!, text_col]]
        end

        g_tasks = df
        """

        function load_model()
            # Load training data
            task_clusters = load("./v0Files/v0_trainings_1/task_clusters.jld2")["task_clusters"]
            disc_clusters = load("./v0Files/v0_trainings_1/disc_clusters.jld2")["disc_clusters"]
            part_price = load("./v0Files/v0_trainings_1/part_price.jld2")["part_price"]
            coom = load("./v0Files/v0_trainings_1/coom.jld2")["coom"]
            lexicon = load("./v0Files/v0_trainings_1/lexicon.jld2")["lexicon"]
            idf = load("./v0Files/v0_trainings_1/idf.jld2")["idf"]
            training_embeddings = load("./v0Files/v0_trainings_1/training_embeddings.jld2")["training_embeddings"]
            return task_clusters, disc_clusters, part_price, coom, lexicon, idf, training_embeddings
        end
        """


        #task_clusters, disc_clusters, part_price, coom, lexicon, idf, training_embeddings = load_model()
        println("waiting model to load")
        task_clusters, disc_clusters, part_price, coom, lexicon, idf, training_embeddings = load_model_once()
        println("The model is loaded")
        println("clustering is intiated")

        # Function to assign clusters to given tasks
        function cluster_given_tasks(df, training_outcomes)
            df.stef = apply_embeddings(df, :description, training_outcomes)
            cluster_assignments = fill(0, nrow(df))

            for i in 1:nrow(df)
                embedding = df.stef[i]
                for j in 1:nrow(task_clusters)
                    if cosine_similarity(embedding, task_clusters.avg_emb[j]) ≥ 0.9
                        cluster_assignments[i] = task_clusters.cluster_id[j]
                        break
                    end
                end
            end

            df.cluster = cluster_assignments
        end

        # Function to compute part quantity
        function partqty(partval)
            return partval ./ part_price
        end

        # Apply clustering to tasks
        gtc_ref = zeros(Int, nrow(task_clusters))
        cluster_given_tasks(g_tasks, (lexicon = lexicon, idf = idf, training_embeddings = training_embeddings))
        gtc_ref[sort(unique(filter(!iszero, g_tasks.cluster)))] .= 1

        # Function to find first nonzero index
        function first_stc(cid)
            return findfirst(!=(0), coom[cid, :] .* gtc_ref)
        end
        println("clustering is done")

        println("computing discrepancies")

        # Generate discrepancy predictions
        disc_pred = select(disc_clusters, :cluster_id)
        disc_pred.prob = round.(disc_clusters.nh ./ sum(disc_clusters.nh) .* 100, digits = 1)
        disc_pred.max_mh = maximum.(disc_clusters.amh)
        disc_pred.min_mh = minimum.(disc_clusters.amh)
        disc_pred.avg_mh = round.(mean.(disc_clusters.amh), digits = 1)
        disc_pred.est_mh = round.(median.(disc_clusters.amh), digits = 1)
        disc_pred.exp_cons = partqty.(disc_clusters.avg_emb)
        disc_pred.stc_id = first_stc.(disc_clusters.cluster_id)

        # Generate standard task predictions
        stc_pred = select(task_clusters, :cluster_id)
        stc_pred.max_mh = maximum.(task_clusters.amh)
        stc_pred.min_mh = minimum.(task_clusters.amh)
        stc_pred.avg_mh = round.(mean.(task_clusters.amh), digits = 1)
        stc_pred.est_mh = round.(median.(task_clusters.amh), digits = 1)
        stc_pred.exp_cons = partqty.(mean.(task_clusters.avg_emb))

        # Generate outputs
        out_g = select(g_tasks, "task", "description", "cluster")
        out_stc_vec = filter(row -> row.cluster_id in unique(out_g.cluster), stc_pred)
        out_disc_vec = filter(row -> row.stc_id !== nothing, disc_pred)
        out_g_fin = innerjoin(select(g_tasks, "task", "description", "cluster"), out_stc_vec, on = "cluster" => "cluster_id")

        # Final computed results
        fin_vec = DataFrame(task_cat = Vector{String}(),
                            max_mh = Vector{Float64}(),
                            min_mh = Vector{Float64}(),
                            avg_mh = Vector{Float64}(),
                            est_mh = Vector{Float64}(),
                            exp_cons = Vector{Vector{Float64}}())

        push!(fin_vec, ("source-tasks",
                        sum(out_g_fin.max_mh),
                        sum(out_g_fin.min_mh),
                        sum(out_g_fin.avg_mh),
                        sum(out_g_fin.est_mh),
                        reduce(.+, out_g_fin.exp_cons)))

        push!(fin_vec, ("discrepancies",
                        sum(out_disc_vec.max_mh),
                        0,
                        sum(out_disc_vec.prob .* out_disc_vec.avg_mh),
                        sum(out_disc_vec.prob .* out_disc_vec.est_mh),
                        reduce(.+, [out_disc_vec.prob[i] * out_disc_vec.exp_cons[i] for i in eachindex(out_disc_vec.cluster_id)])))

        push!(fin_vec, ("total",
                        sum(fin_vec.max_mh),
                        sum(fin_vec.min_mh),
                        sum(fin_vec.avg_mh),
                        sum(fin_vec.est_mh),
                        reduce(.+, fin_vec.exp_cons)))

        println("discrepancies are computed")

        println("saving the output")
        

        # Save output CSV files
        CSV.write(filepath * "source_tasks_output.csv", out_g_fin)
        CSV.write(filepath * "stc_vec_output.csv", out_stc_vec)
        CSV.write(filepath * "disc_vec_output.csv", out_disc_vec)
        CSV.write(filepath * "fin_vec_output.csv", fin_vec)
        println("The csv files are generated ")

        # Define filter query to get documents where status is "Progress"
        query = Mongoc.BSON("status" => "Progress")

        # Fetch filtered data
        cursor = Mongoc.find(input_collection, query)

        # Store estID values in an array (if multiple documents match)
        estIDs = [doc["estID"] for doc in cursor]

        if isempty(estIDs)
            println("No documents found with status Progress.")
        else
            # Fetch filtered data for the first estID (modify to loop if needed)
            query = Mongoc.BSON("estID" => estIDs[1])
            cursor = Mongoc.find(input_collection, query)

            # Convert cursor to an array
            docs = collect(cursor)

            if !isempty(docs)
                bson_data = first(docs)  # Safe to access the first document
                println("estID: ", bson_data["estID"])

                # Update the status in status_collection
                update_query = Mongoc.BSON("estID" => bson_data["estID"], "status" => "Progress")
                update_data = Mongoc.BSON("\$set" => Mongoc.BSON("status" => "Csv Generated", "filepath" => filepath))

                result = Mongoc.update_one(input_collection, update_query, update_data)
            else
                println("No matching document found in input_collection.")
            end
        end
    end
end

# Continuous pipeline execution
function run_pipeline()
    try
        while true
            println("Checking MongoDB for new documents...")

            # Find all documents where status = "Initiated"
            query = Mongoc.BSON("status" => "Initiated")
            cursor = Mongoc.find(input_collection, query)
            # Store estID values in an array (if multiple documents match)
            estIDs = [doc["estID"] for doc in cursor]
            if !isempty(estIDs)
                println("Processing document with estID: ", estIDs[1])
                process_document(estIDs)
            else
                println("No documents found with status 'Initiated'.")
            end

            println("Sleeping for 10 seconds before checking again...")
            sleep(10)  # Adjust based on your real-time requirements
        end
    catch e
        println("Pipeline terminated: ", e)
    end
end

# Start pipeline
run_pipeline()
