from lstm import *
from elasticsearch import Elasticsearch, RequestsHttpConnection
 
#---------------------parameter setting


dim_proj=128  # word embeding dimension and LSTM number of hidden units.
patience=10  # Number of epoch to wait before early stop if no progress
max_epochs=5000  # The maximum number of epoch to run
dispFreq=10  # Display to stdout the training progress every N updates
decay_c=0.  # Weight decay for the classifier applied to the U weights.
lrate=0.0001  # Learning rate for sgd (not used for adadelta and rmsprop)
n_words=10000  # Vocabulary size
optimizer=adadelta  # sgd, adadelta and rmsprop available, sgd very hard to use, not recommanded (probably need momentum and decaying learning rate).
encoder='lstm'  # TODO: can be removed must be lstm.
saveto='lstm_model.npz'  # The best model will be saved there
validFreq=370  # Compute the validation error after this number of update.
saveFreq=1110  # Save the parameters after every saveFreq updates
maxlen=100  # Sequence longer then this get ignored
batch_size=16  # The batch size during training.
valid_batch_size=64  # The batch size used for validation/test set.
dataset='tweet'

# Parameter for extra option
noise_std=0.
use_dropout=True  # if False slightly faster, but worst test error
# This frequently need a bigger model.
test_size=500

model_options = locals().copy()

model_options['ydim'] = 2

#---------------------load model

params = init_params(model_options)

load_params('lstm_model.npz', params)

tparams = init_tparams(params)


(use_noise, x, mask, y, f_pred_prob, f_pred, cost) = build_model(tparams, model_options)


#---------------------load data

import pickle

f = open('dict.pkl')
d = pickle.load(f)
f.close()


def convert_to_vector(dict, sentence):
    sentence = sentence.split()
    vector=[]
    for i in range(len(sentence)):
        if len(vector) < maxlen:
            try:
                if dict[sentence[i]] < 10000:
                    vector.append(dict[sentence[i]])
            except KeyError:
                p = 1
    return vector

es = Elasticsearch(
  [
  'elasticsearch_host'
  ],
  use_ssl=True,
  verify_certs=True,
  connection_class = RequestsHttpConnection

  )

res = es.search(index = "candidatetweets", body = {"query": {"match":{text: candidate}, {topics: topic}}})
for hit in res["hits"]["hits"]:
    x, mask, y = prepare_data([convert_to_vector(d,hit)],numpy.array([0]), maxlen=None)
    preds = f_pred(x, mask)
    es.update(index = "candidatetweets", body = {"doc": {"sentiment":preds}})





